from __future__ import annotations

import asyncio
import json
import os
import shlex
import sqlite3
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from fastapi import HTTPException

from .config import (
    APPROVAL_POLICIES,
    MODEL_SUGGESTIONS,
    REASONING_EFFORTS,
    SANDBOX_MODES,
    TERMINAL_APPS,
    Settings,
    coerce_bool,
    is_git_write_request,
    is_environment_message,
    is_internal_harness_message,
    is_smoke_test_prompt,
    is_visible_user_message,
    load_toml,
    now_iso,
    prompt_title,
    read_text_parts,
    save_toml,
)
from .store import SessionStore


class CodexRepository:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.sessions_dir = self.settings.codex_dir / "sessions"

    def _app_config(self) -> dict[str, Any]:
        return load_toml(self.settings.config_path)

    def _codex_config(self) -> dict[str, Any]:
        return load_toml(self.settings.codex_config_path)

    def _connect_state_db(self) -> sqlite3.Connection | None:
        if not self.settings.state_db.exists():
            return None
        connection = sqlite3.connect(str(self.settings.state_db))
        connection.row_factory = sqlite3.Row
        return connection

    def allowed_workspaces(self) -> list[dict[str, Any]]:
        root = Path(self.settings.default_allowed_root).expanduser()
        items: list[dict[str, Any]] = []
        if root.exists():
            for path in sorted(root.iterdir(), key=lambda item: item.name.lower()):
                if path.is_dir() and not path.name.startswith("."):
                    items.append(
                        {
                            "name": path.name,
                            "path": str(path),
                            "type": "directory",
                            "has_children": True,
                            "pinned": path == self.settings.base_dir,
                        }
                    )
        current = str(self.settings.base_dir)
        if not any(item["path"] == current for item in items):
            items.insert(
                0,
                {
                    "name": self.settings.base_dir.name,
                    "path": current,
                    "type": "directory",
                    "has_children": True,
                    "pinned": True,
                },
            )
        return items

    def _allowed_workspace_paths(self) -> list[Path]:
        return [Path(item["path"]).expanduser() for item in self.allowed_workspaces()]

    def is_allowed_cwd(self, cwd: str | None) -> bool:
        value = str(cwd or "").strip()
        if not value:
            return False
        candidate = Path(value).expanduser()
        try:
            candidate_resolved = candidate.resolve(strict=False)
        except OSError:
            candidate_resolved = candidate
        for root in self._allowed_workspace_paths():
            try:
                root_resolved = root.resolve(strict=False)
            except OSError:
                root_resolved = root
            if candidate_resolved == root_resolved or root_resolved in candidate_resolved.parents:
                return True
        return False

    def ensure_workspace(self, cwd: str) -> dict[str, Any]:
        value = str(cwd or "").strip()
        if not value:
            raise HTTPException(status_code=400, detail={"code": "INVALID_REQUEST", "message": "cwd is required"})
        candidate = Path(value).expanduser()
        if not candidate.exists() or not candidate.is_dir():
            raise HTTPException(status_code=400, detail={"code": "INVALID_REQUEST", "message": "Workspace path must be an existing directory"})
        if not self.is_allowed_cwd(str(candidate)):
            raise HTTPException(status_code=403, detail={"code": "PROJECT_NOT_ALLOWED", "message": "Workspace not allowed"})
        return {
            "name": candidate.name,
            "path": str(candidate),
            "type": "directory",
            "has_children": True,
            "pinned": str(candidate) == str(self.settings.base_dir),
        }

    def default_model(self) -> str:
        app_config = self._app_config()
        configured = str(app_config.get("model") or "").strip()
        if configured:
            return configured
        configured = str(self._codex_config().get("model") or "").strip()
        return configured or MODEL_SUGGESTIONS[0]

    def default_reasoning_effort(self) -> str:
        app_config = self._app_config()
        configured = str(app_config.get("reasoning_effort") or app_config.get("model_reasoning_effort") or "").strip().lower()
        if configured in REASONING_EFFORTS:
            return configured
        configured = str(self._codex_config().get("model_reasoning_effort") or "").strip().lower()
        return configured if configured in REASONING_EFFORTS else "medium"

    def default_terminal_app(self) -> str:
        configured = str(self._app_config().get("terminal_app") or "").strip().lower()
        if configured in TERMINAL_APPS:
            return configured
        configured = str(self._codex_config().get("terminal_app") or "").strip().lower()
        return configured if configured in TERMINAL_APPS else "terminal"

    def default_sandbox_mode(self) -> str:
        configured = str(self._app_config().get("sandbox_mode") or "").strip().lower()
        if configured in SANDBOX_MODES:
            return configured
        configured = str(self._codex_config().get("sandbox_mode") or "").strip().lower()
        return configured if configured in SANDBOX_MODES else "workspace-write"

    def default_approval_policy(self) -> str:
        configured = str(self._app_config().get("approval_policy") or "").strip().lower()
        if configured in APPROVAL_POLICIES:
            return configured
        configured = str(self._codex_config().get("approval_policy") or "").strip().lower()
        return configured if configured in APPROVAL_POLICIES else "never"

    def default_git_write_enabled(self) -> bool:
        configured = coerce_bool(self._app_config().get("git_write_enabled"))
        if configured is not None:
            return configured
        configured = coerce_bool(self._codex_config().get("git_write_enabled"))
        return bool(configured)

    def default_git_write_sandbox_mode(self) -> str:
        configured = str(self._app_config().get("git_write_sandbox_mode") or "").strip().lower()
        if configured in SANDBOX_MODES:
            return configured
        configured = str(self._codex_config().get("git_write_sandbox_mode") or "").strip().lower()
        return configured if configured in SANDBOX_MODES else "danger-full-access"

    def default_git_write_approval_policy(self) -> str:
        configured = str(self._app_config().get("git_write_approval_policy") or "").strip().lower()
        if configured in APPROVAL_POLICIES:
            return configured
        configured = str(self._codex_config().get("git_write_approval_policy") or "").strip().lower()
        return configured if configured in APPROVAL_POLICIES else "on-request"

    def should_use_git_write_profile(self, prompt: str | None = None, *, for_terminal: bool = False) -> bool:
        if not self.default_git_write_enabled():
            return False
        return for_terminal or is_git_write_request(prompt)

    def command_permissions(self, prompt: str | None = None, *, for_terminal: bool = False) -> tuple[str, str, str]:
        if self.should_use_git_write_profile(prompt, for_terminal=for_terminal):
            return (
                self.default_git_write_sandbox_mode(),
                self.default_git_write_approval_policy(),
                "git_write",
            )
        return (
            self.default_sandbox_mode(),
            self.default_approval_policy(),
            "default",
        )

    def settings_payload(self) -> dict[str, Any]:
        config = self._app_config()
        return {
            "config_path": str(self.settings.config_path),
            "codex_config_path": str(self.settings.codex_config_path),
            "model": str(config.get("model") or "").strip(),
            "reasoning_effort": str(config.get("reasoning_effort") or config.get("model_reasoning_effort") or "").strip().lower(),
            "terminal_app": str(config.get("terminal_app") or "").strip().lower(),
            "sandbox_mode": str(config.get("sandbox_mode") or "").strip().lower(),
            "approval_policy": str(config.get("approval_policy") or "").strip().lower(),
            "git_write_enabled": bool(coerce_bool(config.get("git_write_enabled"))),
            "git_write_sandbox_mode": str(config.get("git_write_sandbox_mode") or "").strip().lower(),
            "git_write_approval_policy": str(config.get("git_write_approval_policy") or "").strip().lower(),
        }

    def update_settings(
        self,
        model: str,
        reasoning_effort: str,
        terminal_app: str,
        sandbox_mode: str,
        approval_policy: str,
        git_write_enabled: bool | None = None,
        git_write_sandbox_mode: str = "",
        git_write_approval_policy: str = "",
    ) -> dict[str, Any]:
        config = self._app_config()
        if model:
            config["model"] = model
        if reasoning_effort:
            config["reasoning_effort"] = reasoning_effort
            config.pop("model_reasoning_effort", None)
        if terminal_app:
            config["terminal_app"] = terminal_app
        if sandbox_mode:
            config["sandbox_mode"] = sandbox_mode
        if approval_policy:
            config["approval_policy"] = approval_policy
        if git_write_enabled is not None:
            config["git_write_enabled"] = git_write_enabled
        if git_write_sandbox_mode:
            config["git_write_sandbox_mode"] = git_write_sandbox_mode
        if git_write_approval_policy:
            config["git_write_approval_policy"] = git_write_approval_policy
        save_toml(self.settings.config_path, config)
        return self.settings_payload()

    def available_models(self) -> list[str]:
        items: list[str] = []
        seen: set[str] = set()

        def add(value: str | None) -> None:
            model = str(value or "").strip()
            if model and model not in seen:
                seen.add(model)
                items.append(model)

        add(self.default_model())
        for model in MODEL_SUGGESTIONS:
            add(model)
        connection = self._connect_state_db()
        if connection is None:
            return items
        try:
            rows = connection.execute(
                """
                SELECT DISTINCT model
                FROM threads
                WHERE model IS NOT NULL AND TRIM(model) != ''
                ORDER BY updated_at DESC
                LIMIT 12
                """
            ).fetchall()
        except sqlite3.Error:
            rows = []
        finally:
            connection.close()
        for row in rows:
            add(row["model"])
        return items

    def find_rollout_path(self, thread_id: str) -> Path | None:
        if not thread_id or not self.sessions_dir.exists():
            return None
        matches = sorted(self.sessions_dir.rglob(f"*{thread_id}.jsonl"))
        return matches[-1] if matches else None

    def observed_runtime_permissions(self, thread_id: str) -> dict[str, Any] | None:
        rollout_path = self.find_rollout_path(thread_id)
        if rollout_path is None or not rollout_path.exists():
            return None
        observed: dict[str, Any] | None = None
        try:
            with rollout_path.open("r", encoding="utf-8") as handle:
                for line in handle:
                    try:
                        obj = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if obj.get("type") != "turn_context":
                        continue
                    payload = obj.get("payload", {})
                    sandbox_policy = payload.get("sandbox_policy") or {}
                    sandbox_mode = ""
                    if isinstance(sandbox_policy, dict):
                        sandbox_mode = str(sandbox_policy.get("type") or "").strip().lower()
                    approval_policy = str(payload.get("approval_policy") or "").strip().lower()
                    if not sandbox_mode and not approval_policy:
                        continue
                    observed = {
                        "sandbox_mode": sandbox_mode,
                        "approval_policy": approval_policy,
                        "rollout_path": str(rollout_path),
                    }
        except OSError:
            return None
        return observed

    def permission_diagnostic(self, thread_id: str, requested_sandbox: str, requested_approval: str) -> str:
        observed = self.observed_runtime_permissions(thread_id)
        if not observed:
            return ""
        actual_sandbox = str(observed.get("sandbox_mode") or "").strip().lower()
        actual_approval = str(observed.get("approval_policy") or "").strip().lower()
        if actual_sandbox == requested_sandbox and actual_approval == requested_approval:
            return ""
        return (
            "Requested permissions did not fully apply. "
            f"requested sandbox={requested_sandbox}, approval={requested_approval}; "
            f"actual sandbox={actual_sandbox or 'unknown'}, approval={actual_approval or 'unknown'}. "
            "This usually means the process launching Codex is itself sandbox-limited, so child runs cannot elevate further."
        )

    def thread_title(self, thread_id: str) -> str | None:
        rollout_path = self.find_rollout_path(thread_id)
        if rollout_path is None:
            return None
        try:
            with rollout_path.open("r", encoding="utf-8") as handle:
                for line in handle:
                    obj = json.loads(line)
                    if obj.get("type") != "response_item":
                        continue
                    payload = obj.get("payload", {})
                    if payload.get("type") != "message" or payload.get("role") != "user":
                        continue
                    text = read_text_parts(payload.get("content", []))
                    if is_visible_user_message(text) and not is_smoke_test_prompt(text):
                        return prompt_title(text)
        except (OSError, json.JSONDecodeError):
            return None
        return None

    def get_messages(self, thread_id: str) -> list[dict[str, Any]]:
        rollout_path = self.find_rollout_path(thread_id)
        if rollout_path is None or not rollout_path.exists():
            return []
        messages: list[dict[str, Any]] = []
        with rollout_path.open("r", encoding="utf-8") as handle:
            for line in handle:
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if obj.get("type") != "response_item":
                    continue
                payload = obj.get("payload", {})
                if payload.get("type") != "message":
                    continue
                role = payload.get("role")
                if role not in {"user", "assistant"}:
                    continue
                text = read_text_parts(payload.get("content", []))
                if not text or is_environment_message(text) or is_internal_harness_message(text):
                    continue
                kind = "summary" if role == "assistant" and payload.get("phase") == "final_answer" else "message"
                messages.append(
                    {
                        "id": f"msg_{len(messages) + 1}",
                        "thread_id": thread_id,
                        "role": role,
                        "type": "message",
                        "text": text,
                        "kind": kind,
                        "created_at": obj.get("timestamp") or now_iso(),
                    }
                )
        return messages

    def system_status(self, active_runs: int) -> dict[str, Any]:
        return {
            "codex_cli_available": self.settings.codex_bin is not None,
            "codex_cli_path": self.settings.codex_bin or "",
            "codex_cli_version": self.settings.codex_version,
            "codex_data_readable": self.settings.codex_dir.exists() and self.sessions_dir.exists(),
            "active_runs": active_runs,
            "allowed_workspaces": self.allowed_workspaces(),
            "models": self.available_models(),
            "default_model": self.default_model(),
            "reasoning_efforts": REASONING_EFFORTS,
            "default_reasoning_effort": self.default_reasoning_effort(),
            "terminal_apps": TERMINAL_APPS,
            "default_terminal_app": self.default_terminal_app(),
            "sandbox_modes": SANDBOX_MODES,
            "default_sandbox_mode": self.default_sandbox_mode(),
            "approval_policies": APPROVAL_POLICIES,
            "default_approval_policy": self.default_approval_policy(),
            "default_git_write_enabled": self.default_git_write_enabled(),
            "default_git_write_sandbox_mode": self.default_git_write_sandbox_mode(),
            "default_git_write_approval_policy": self.default_git_write_approval_policy(),
            "settings": self.settings_payload(),
        }


@dataclass
class CliParserState:
    thread_id: str | None = None
    final_message: str | None = None
    turn_completed: bool = False
    last_error_message: str | None = None


class CliEventParser:
    def __init__(self) -> None:
        self.state = CliParserState()

    def _extract_item_text(self, item: dict[str, Any]) -> str:
        text = str(item.get("text") or "").strip()
        if text:
            return text
        content = item.get("content")
        if isinstance(content, list):
            parts: list[str] = []
            for chunk in content:
                if isinstance(chunk, dict) and chunk.get("text"):
                    parts.append(str(chunk["text"]))
            return "".join(parts).strip()
        return ""

    def parse_stdout_line(self, raw_line: str) -> tuple[str, dict[str, Any]] | None:
        text = str(raw_line or "").strip()
        if not text:
            return None
        try:
            payload = json.loads(text)
        except json.JSONDecodeError:
            return ("run.log", {"stream": "stdout", "line": text})
        if not isinstance(payload, dict):
            return ("run.log", {"stream": "stdout", "line": text})
        event_type = str(payload.get("type") or "unknown").strip() or "unknown"
        if event_type == "thread.started":
            thread_id = str(payload.get("thread_id") or "").strip()
            if thread_id:
                self.state.thread_id = thread_id
        elif event_type == "item.completed":
            item = payload.get("item")
            if isinstance(item, dict) and str(item.get("type") or "") in {"agent_message", "assistant_message"}:
                message = self._extract_item_text(item)
                if message:
                    self.state.final_message = message
        elif event_type == "error":
            message = str(payload.get("message") or "").strip()
            if message:
                self.state.last_error_message = message
        elif event_type == "turn.completed":
            self.state.turn_completed = True
        return ("run.event", {"event_type": event_type, "payload": payload})

    def parse_stderr_line(self, raw_line: str) -> tuple[str, dict[str, Any]] | None:
        text = str(raw_line or "").strip()
        if not text:
            return None
        return ("run.log", {"stream": "stderr", "line": text})


class CodexCliRunner:
    def __init__(self, settings: Settings, store: SessionStore, repository: CodexRepository):
        self.settings = settings
        self.store = store
        self.repository = repository
        self._subscribers: dict[str, set[asyncio.Queue[dict[str, Any]]]] = {}
        self._processes: dict[str, asyncio.subprocess.Process] = {}
        self._cancel_requested: set[str] = set()
        self._lock = asyncio.Lock()
        self._shell_env_cache: dict[str, str] | None = None

    @staticmethod
    def _managed_codex_prefix() -> list[str]:
        # Web-managed runs do not need marketplace/plugin discovery and can hang on remote sync.
        return ["--disable", "plugins"]

    @staticmethod
    def _execution_flags(permission_profile: str, sandbox_mode: str, approval_policy: str) -> list[str]:
        return ["--dangerously-bypass-approvals-and-sandbox"]

    @staticmethod
    def _managed_runtime_expectation() -> tuple[str, str, str]:
        return ("danger-full-access", "never", "managed_full_access")

    def _pid_is_alive(self, pid: int | None) -> bool:
        if not pid or pid <= 0:
            return False
        try:
            os.kill(pid, 0)
        except ProcessLookupError:
            return False
        except PermissionError:
            return True
        return True

    def reconcile_incomplete_runs(self) -> list[dict[str, Any]]:
        recovered: list[dict[str, Any]] = []
        for run in self.store.list_active_runs():
            session = self.store.get_session(run["session_id"])
            if run["status"] == "running" and self._pid_is_alive(run["pid"]):
                continue
            reason = "Recovered stale queued run after service restart"
            if run["status"] == "running":
                reason = "Recovered stale running run after service restart"
            session, final_run = self.store.finalize_run(
                run["id"],
                "failed",
                None,
                run["final_message"],
                reason,
            )
            recovered.append({"session": session, "run": final_run})
        return recovered

    def subscribe(self, session_id: str) -> asyncio.Queue[dict[str, Any]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=100)
        self._subscribers.setdefault(session_id, set()).add(queue)
        return queue

    def unsubscribe(self, session_id: str, queue: asyncio.Queue[dict[str, Any]]) -> None:
        listeners = self._subscribers.get(session_id)
        if not listeners:
            return
        listeners.discard(queue)
        if not listeners:
            self._subscribers.pop(session_id, None)

    async def _broadcast(self, session_id: str, event: str, data: dict[str, Any]) -> None:
        payload = {"event": event, "data": data}
        stale: list[asyncio.Queue[dict[str, Any]]] = []
        for queue in self._subscribers.get(session_id, set()):
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                stale.append(queue)
        for queue in stale:
            self.unsubscribe(session_id, queue)

    def session_snapshot(self, session_id: str) -> dict[str, Any]:
        return self.store.session_snapshot(session_id)

    def _load_shell_environment(self) -> dict[str, str]:
        if self._shell_env_cache is not None:
            return dict(self._shell_env_cache)
        shell = os.environ.get("SHELL") or "/bin/zsh"
        command = "env -0"
        try:
            result = subprocess.run(
                [shell, "-ic", command],
                capture_output=True,
                env={**os.environ, "HOME": str(self.settings.home)},
                timeout=8,
                check=False,
            )
        except (OSError, subprocess.SubprocessError):
            self._shell_env_cache = {}
            return {}
        payload = result.stdout or b""
        loaded: dict[str, str] = {}
        for chunk in payload.split(b"\x00"):
            if not chunk or b"=" not in chunk:
                continue
            key, value = chunk.split(b"=", 1)
            try:
                loaded[key.decode("utf-8", "ignore")] = value.decode("utf-8", "ignore")
            except UnicodeDecodeError:
                continue
        self._shell_env_cache = loaded
        return dict(loaded)

    async def start_session(self, cwd: str, model: str, prompt: str) -> tuple[dict[str, Any], dict[str, Any]]:
        if not self.settings.codex_bin:
            raise HTTPException(status_code=503, detail={"code": "CODEX_EXEC_FAILED", "message": "Codex CLI not found"})
        self.repository.ensure_workspace(cwd)
        session = self.store.create_session(cwd=cwd, model=model or self.repository.default_model(), title=prompt_title(prompt))
        run = self.store.create_run(session["id"], "new", prompt)
        session = self.store.get_session(session["id"])
        await self._broadcast(session["id"], "run.queued", {"session": session, "run": run})
        asyncio.create_task(self._execute_run(run["id"]))
        return session, run

    async def resume_session(self, session_id: str, prompt: str) -> tuple[dict[str, Any], dict[str, Any]]:
        if not self.settings.codex_bin:
            raise HTTPException(status_code=503, detail={"code": "CODEX_EXEC_FAILED", "message": "Codex CLI not found"})
        default_model = self.repository.default_model()
        self.store.update_session_model(session_id, default_model)
        session = self.store.get_session(session_id)
        if not session["codex_thread_id"]:
            raise HTTPException(status_code=409, detail={"code": "CONFLICT", "message": "Session has no Codex thread id yet"})
        run = self.store.create_run(session_id, "resume", prompt)
        session = self.store.get_session(session_id)
        await self._broadcast(session_id, "run.queued", {"session": session, "run": run})
        asyncio.create_task(self._execute_run(run["id"]))
        return session, run

    async def cancel_run(self, run_id: str) -> dict[str, Any]:
        run = self.store.get_run(run_id)
        if run["status"] not in {"queued", "running"}:
            raise HTTPException(status_code=409, detail={"code": "CONFLICT", "message": "Run is not active"})
        async with self._lock:
            self._cancel_requested.add(run_id)
            process = self._processes.get(run_id)
        if process is None:
            session, updated_run = self.store.cancel_queued_run(run_id)
            await self._broadcast(session["id"], "run.cancelled", {"session": session, "run": updated_run})
            return updated_run
        process.terminate()
        return self.store.get_run(run_id)

    def _build_command(self, session: dict[str, Any], run: dict[str, Any]) -> list[str]:
        if not self.settings.codex_bin:
            raise HTTPException(status_code=503, detail={"code": "CODEX_EXEC_FAILED", "message": "Codex CLI not found"})
        effort = self.repository.default_reasoning_effort()
        sandbox_mode, approval_policy, permission_profile = self._managed_runtime_expectation()
        effort_override = f'model_reasoning_effort="{effort}"'
        if run["type"] == "new":
            command = [
                self.settings.codex_bin,
                *self._managed_codex_prefix(),
                *self._execution_flags(permission_profile, sandbox_mode, approval_policy),
                "exec",
                "--json",
                "-C",
                session["cwd"],
                "--skip-git-repo-check",
                "-c",
                effort_override,
            ]
            if session["model"]:
                command.extend(["-m", session["model"]])
            command.append(run["prompt"])
            return command
        if not session["codex_thread_id"]:
            raise HTTPException(status_code=409, detail={"code": "CONFLICT", "message": "Session has no Codex thread id yet"})
        return [
            self.settings.codex_bin,
            *self._managed_codex_prefix(),
            *self._execution_flags(permission_profile, sandbox_mode, approval_policy),
            "exec",
            "resume",
            "--json",
            "-c",
            effort_override,
            "-m",
            session["model"],
            session["codex_thread_id"],
            run["prompt"],
        ]

    async def _run_applescript(self, script: str, failure_message: str) -> None:
        try:
            process = await asyncio.create_subprocess_exec(
                "/usr/bin/osascript",
                "-",
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await process.communicate(script.encode("utf-8"))
        except (OSError, subprocess.SubprocessError) as exc:
            raise HTTPException(status_code=500, detail={"code": "INTERNAL_ERROR", "message": str(exc)}) from exc
        if process.returncode != 0:
            message = (stderr or b"").decode("utf-8", "ignore").strip() or failure_message
            raise HTTPException(status_code=500, detail={"code": "INTERNAL_ERROR", "message": message})

    def _terminal_script(self, shell_command: str) -> tuple[str, str]:
        escaped = shell_command.replace("\\", "\\\\").replace('"', '\\"')
        applescript = f'''
tell application "Terminal"
    activate
    do script "{escaped}"
end tell
'''
        return applescript, "Failed to open Terminal"

    def _iterm_script(self, shell_command: str) -> tuple[str, str]:
        escaped = shell_command.replace("\\", "\\\\").replace('"', '\\"')
        applescript = f'''
tell application "iTerm"
    activate
    set newWindow to (create window with default profile)
    tell current session of newWindow
        write text "{escaped}"
    end tell
end tell
'''
        return applescript, "Failed to open iTerm"

    async def open_session_in_terminal(self, session_id: str) -> dict[str, Any]:
        session = self.store.get_session(session_id)
        if sys.platform != "darwin":
            raise HTTPException(status_code=400, detail={"code": "UNSUPPORTED_PLATFORM", "message": "Terminal open is supported on macOS only"})
        if not session["codex_thread_id"]:
            raise HTTPException(status_code=409, detail={"code": "CONFLICT", "message": "Session has no Codex thread id yet"})
        if not self.settings.codex_bin:
            raise HTTPException(status_code=503, detail={"code": "CODEX_EXEC_FAILED", "message": "Codex CLI not found"})
        terminal_app = self.repository.default_terminal_app()
        sandbox_mode, approval_policy, permission_profile = self._managed_runtime_expectation()
        execution_flags = " ".join(
            shlex.quote(part) for part in self._execution_flags(permission_profile, sandbox_mode, approval_policy)
        )
        shell_command = (
            f"cd {shlex.quote(session['cwd'])} && "
            f"{shlex.quote(self.settings.codex_bin)} "
            f"{' '.join(shlex.quote(part) for part in self._managed_codex_prefix())} "
            f"{execution_flags} "
            f"resume {shlex.quote(session['codex_thread_id'])}"
        )
        if terminal_app == "iterm":
            applescript, failure_message = self._iterm_script(shell_command)
        else:
            applescript, failure_message = self._terminal_script(shell_command)
        await self._run_applescript(applescript, failure_message)
        return {
            "opened": True,
            "terminal_app": terminal_app,
            "sandbox_mode": sandbox_mode,
            "approval_policy": approval_policy,
            "permission_profile": permission_profile,
            "session_id": session_id,
            "thread_id": session["codex_thread_id"],
            "cwd": session["cwd"],
        }

    async def _emit_normalized_event(
        self,
        session_id: str,
        run_id: str,
        channel: str,
        payload: dict[str, Any],
    ) -> None:
        event_type = payload.get("event_type", "cli_log") if channel == "run.event" else "cli_log"
        event = self.store.append_event(run_id, event_type, payload)
        await self._broadcast(session_id, channel, {"session_id": session_id, "run_id": run_id, "event": event})

    async def _consume_stdout(
        self,
        session: dict[str, Any],
        run: dict[str, Any],
        parser: CliEventParser,
        stream: asyncio.StreamReader | None,
    ) -> None:
        if stream is None:
            return
        while True:
            line = await stream.readline()
            if not line:
                break
            normalized = parser.parse_stdout_line(line.decode("utf-8", errors="replace"))
            if normalized is None:
                continue
            channel, payload = normalized
            if parser.state.thread_id and not self.store.get_session(session["id"])["codex_thread_id"]:
                self.store.bind_thread_id(session["id"], parser.state.thread_id)
            await self._emit_normalized_event(session["id"], run["id"], channel, payload)

    async def _consume_stderr(
        self,
        session: dict[str, Any],
        run: dict[str, Any],
        parser: CliEventParser,
        stream: asyncio.StreamReader | None,
        stderr_lines: list[str],
    ) -> None:
        if stream is None:
            return
        while True:
            line = await stream.readline()
            if not line:
                break
            normalized = parser.parse_stderr_line(line.decode("utf-8", errors="replace"))
            if normalized is None:
                continue
            stderr_lines.append(normalized[1]["line"])
            if len(stderr_lines) > 20:
                del stderr_lines[:-20]
            await self._emit_normalized_event(session["id"], run["id"], normalized[0], normalized[1])

    async def _execute_run(self, run_id: str) -> None:
        run = self.store.get_run(run_id)
        session = self.store.get_session(run["session_id"])
        if run_id in self._cancel_requested and run["status"] == "queued":
            self._cancel_requested.discard(run_id)
            session, run = self.store.cancel_queued_run(run_id)
            await self._broadcast(session["id"], "run.cancelled", {"session": session, "run": run})
            return
        parser = CliEventParser()
        stderr_lines: list[str] = []
        try:
            command = self._build_command(session, run)
            env = os.environ.copy()
            env.update(self._load_shell_environment())
            env["HOME"] = str(self.settings.home)
            process = await asyncio.create_subprocess_exec(
                *command,
                cwd=session["cwd"],
                env=env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
        except OSError as exc:
            session, failed_run = self.store.finalize_run(run_id, "failed", None, None, str(exc))
            await self._broadcast(session["id"], "run.failed", {"session": session, "run": failed_run})
            return

        async with self._lock:
            self._processes[run_id] = process
        run = self.store.mark_run_started(run_id, process.pid or 0)
        await self._broadcast(session["id"], "run.started", {"session": self.store.get_session(session["id"]), "run": run})

        stdout_task = asyncio.create_task(self._consume_stdout(session, run, parser, process.stdout))
        stderr_task = asyncio.create_task(self._consume_stderr(session, run, parser, process.stderr, stderr_lines))
        exit_code = await process.wait()
        await asyncio.gather(stdout_task, stderr_task)

        async with self._lock:
            self._processes.pop(run_id, None)
            cancelled = run_id in self._cancel_requested
            self._cancel_requested.discard(run_id)

        if parser.state.thread_id:
            self.store.bind_thread_id(session["id"], parser.state.thread_id)

        thread_id = self.store.get_session(session["id"])["codex_thread_id"]
        if thread_id:
            title = self.repository.thread_title(thread_id)
            if title:
                self.store.update_session_title(session["id"], title)

        stderr_tail = "\n".join(stderr_lines[-20:])
        status = "completed"
        if cancelled:
            status = "cancelled"
        elif exit_code != 0 or not parser.state.turn_completed:
            status = "failed"
        permission_note = self.repository.permission_diagnostic(thread_id, *self._managed_runtime_expectation()[:2]) if thread_id else ""
        if permission_note:
            stderr_tail = f"{stderr_tail}\n{permission_note}".strip()
        if status == "failed" and parser.state.last_error_message:
            stderr_tail = f"{stderr_tail}\n{parser.state.last_error_message}".strip()
        session, final_run = self.store.finalize_run(run_id, status, exit_code, parser.state.final_message, stderr_tail)
        final_event = {
            "completed": "run.completed",
            "failed": "run.failed",
            "cancelled": "run.cancelled",
        }[status]
        await self._broadcast(session["id"], final_event, {"session": session, "run": final_run})
