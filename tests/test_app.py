from __future__ import annotations

import asyncio
import json
import stat
import subprocess
import tempfile
import textwrap
import unittest
from unittest import mock
from pathlib import Path

import httpx
from fastapi.testclient import TestClient

from app.codex import CliEventParser
from app.config import Settings, is_git_write_request
from app.main import create_app


FAKE_CODEX_SCRIPT = """#!/usr/bin/env python3
import json
import os
import sys
import time
from pathlib import Path

def sessions_root():
    return Path(os.environ["HOME"]) / ".codex" / "sessions" / "test"

def rollout_path(thread_id):
    root = sessions_root()
    root.mkdir(parents=True, exist_ok=True)
    return root / f"{thread_id}.jsonl"

def write_turn(thread_id, prompt, answer):
    path = rollout_path(thread_id)
    if not path.exists():
        path.write_text("", encoding="utf-8")
    if path.stat().st_size == 0:
        with path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps({"type": "session_meta", "payload": {"id": thread_id, "cwd": os.getcwd(), "timestamp": "2026-04-09T00:00:00Z"}}) + "\\n")
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps({"type": "response_item", "timestamp": "2026-04-09T00:00:01Z", "payload": {"type": "message", "role": "user", "content": [{"text": prompt}]}}) + "\\n")
        handle.write(json.dumps({"type": "response_item", "timestamp": "2026-04-09T00:00:02Z", "payload": {"type": "message", "role": "assistant", "phase": "final_answer", "content": [{"text": answer}]}}) + "\\n")

def main():
    args = sys.argv[1:]
    if "--version" in args:
        print("codex-cli 0.test")
        return 0
    filtered = []
    index = 0
    options_with_values = {
        "-s", "--sandbox",
        "-a", "--ask-for-approval",
        "-C", "--cd",
        "-m", "--model",
        "-c", "--config",
        "-p", "--profile",
        "-o", "--output-last-message",
        "--enable", "--disable",
    }
    flags = {
        "--json",
        "--skip-git-repo-check",
        "--full-auto",
        "--dangerously-bypass-approvals-and-sandbox",
        "--ephemeral",
        "--last",
        "--all",
    }
    while index < len(args):
        token = args[index]
        if token in options_with_values:
            index += 2
            continue
        if token in flags:
            index += 1
            continue
        filtered.append(token)
        index += 1
    args = filtered
    if args[:2] == ["exec", "resume"]:
        thread_id = args[-2]
        prompt = args[-1]
        if "cancel" in prompt:
            print(json.dumps({"type": "thread.started", "thread_id": thread_id}))
            sys.stdout.flush()
            time.sleep(4)
            print(json.dumps({"type": "turn.completed", "usage": {"output_tokens": 1}}))
            sys.stdout.flush()
            return 0
        if "fail" in prompt:
            print("warn: noisy stdout line")
            print(json.dumps({"type": "thread.started", "thread_id": thread_id}))
            print("failing now", file=sys.stderr)
            sys.stdout.flush()
            sys.stderr.flush()
            return 1
        answer = f"resumed: {prompt}"
        write_turn(thread_id, prompt, answer)
        print(json.dumps({"type": "thread.started", "thread_id": thread_id}))
        print(json.dumps({"type": "item.completed", "item": {"type": "agent_message", "text": answer}}))
        print(json.dumps({"type": "turn.completed", "usage": {"output_tokens": 3}}))
        return 0
    if args and args[0] == "exec":
        prompt = args[-1]
        thread_id = "thread-new-123"
        if "cancel" in prompt:
            print(json.dumps({"type": "thread.started", "thread_id": thread_id}))
            sys.stdout.flush()
            time.sleep(4)
            print(json.dumps({"type": "turn.completed", "usage": {"output_tokens": 1}}))
            sys.stdout.flush()
            return 0
        answer = f"answer: {prompt}"
        write_turn(thread_id, prompt, answer)
        print("warn: noisy stdout line")
        print(json.dumps({"type": "thread.started", "thread_id": thread_id}))
        print(json.dumps({"type": "item.completed", "item": {"type": "agent_message", "text": answer}}))
        print(json.dumps({"type": "turn.completed", "usage": {"output_tokens": 3}}))
        return 0
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
"""


class ParserTests(unittest.TestCase):
    def test_parser_handles_json_and_logs(self) -> None:
        parser = CliEventParser()
        self.assertEqual(
            parser.parse_stdout_line('{"type":"thread.started","thread_id":"abc"}'),
            ("run.event", {"event_type": "thread.started", "payload": {"type": "thread.started", "thread_id": "abc"}}),
        )
        self.assertEqual(parser.state.thread_id, "abc")
        self.assertEqual(
            parser.parse_stdout_line("warn: noisy stdout line"),
            ("run.log", {"stream": "stdout", "line": "warn: noisy stdout line"}),
        )
        self.assertEqual(
            parser.parse_stdout_line('{"type":"item.completed","item":{"type":"agent_message","text":"done"}}'),
            (
                "run.event",
                {
                    "event_type": "item.completed",
                    "payload": {"type": "item.completed", "item": {"type": "agent_message", "text": "done"}},
                },
            ),
        )
        self.assertEqual(parser.state.final_message, "done")
        parser.parse_stdout_line('{"type":"turn.completed"}')
        self.assertTrue(parser.state.turn_completed)

    def test_git_write_request_matches_keywords(self) -> None:
        self.assertTrue(is_git_write_request("请帮我 git commit 当前改动"))
        self.assertTrue(is_git_write_request("新建一个分支，并且创建一个1.txt文件，然后提交过去看看"))
        self.assertTrue(is_git_write_request("先提交一下这批改动"))
        self.assertTrue(is_git_write_request("帮我推送到远端"))
        self.assertTrue(is_git_write_request("看看这个分支怎么处理"))
        self.assertFalse(is_git_write_request("只看一下 git status，不要修改任何内容"))


class AppTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.base = Path(self.temp_dir.name)
        (self.base / "static").mkdir()
        (self.base / "templates").mkdir()
        (self.base / "templates" / "index.html").write_text("<div>ok</div>", encoding="utf-8")
        (self.base / "static" / "app.js").write_text("", encoding="utf-8")
        (self.base / "static" / "styles.css").write_text("", encoding="utf-8")

        home = self.base / "home"
        codex_dir = home / ".codex"
        codex_dir.mkdir(parents=True)
        fake_codex = self.base / "fake-codex.py"
        fake_codex.write_text(textwrap.dedent(FAKE_CODEX_SCRIPT), encoding="utf-8")
        fake_codex.chmod(fake_codex.stat().st_mode | stat.S_IEXEC)

        support_dir = self.base / ".codexapp"
        support_dir.mkdir(parents=True)

        settings = Settings(
            base_dir=self.base,
            home=home,
            codex_dir=codex_dir,
            state_db=codex_dir / "state_5.sqlite",
            session_index=codex_dir / "session_index.jsonl",
            config_path=support_dir / "settings.toml",
            codex_config_path=codex_dir / "config.toml",
            app_support_dir=support_dir,
            app_db=support_dir / "app.db",
            auth_state_file=codex_dir / "codexapp_auth.json",
            session_cookie="codexapp_session",
            session_cookie_secure=None,
            login_username="admin",
            login_password="codexapp-demo",
            default_allowed_root=str(self.base / "workspaces"),
            codex_bin=str(fake_codex),
            codex_version="codex-cli 0.test",
        )
        workspaces = Path(settings.default_allowed_root)
        (workspaces / "proj").mkdir(parents=True)
        self.settings = settings
        self.app = create_app(settings)
        self.client = TestClient(self.app)

    def tearDown(self) -> None:
        self.client.close()
        self.temp_dir.cleanup()

    def login(self) -> None:
        response = self.client.post("/api/auth/login", json={"username": "admin", "password": "codexapp-demo"})
        self.assertEqual(response.status_code, 200)

    def auth_cookies(self) -> dict[str, str]:
        token = self.app.state.store.create_auth_session()
        return {self.settings.session_cookie: token}

    async def async_request(self, method: str, path: str, *, json_body: dict | None = None, cookies: dict[str, str] | None = None) -> httpx.Response:
        transport = httpx.ASGITransport(app=self.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            if cookies:
                client.cookies.update(cookies)
            response = await client.request(method, path, json=json_body)
        return response

    async def wait_for_terminal_run(self, session_id: str, cookies: dict[str, str], expected: str, attempts: int = 60) -> list[dict]:
        for _ in range(attempts):
            response = await self.async_request("GET", f"/api/sessions/{session_id}/runs", cookies=cookies)
            runs = response.json()["data"]["items"]
            if runs and runs[0]["status"] == expected:
                return runs
            await asyncio.sleep(0.1)
        self.fail(f"session {session_id} did not reach {expected}")

    def test_requires_auth(self) -> None:
        response = self.client.get("/api/sessions")
        self.assertEqual(response.status_code, 401)

    def test_create_session_and_resume(self) -> None:
        async def scenario() -> None:
            cookies = self.auth_cookies()
            response = await self.async_request(
                "POST",
                "/api/sessions",
                json_body={
                    "cwd": str(Path(self.settings.default_allowed_root) / "proj"),
                    "prompt": "first prompt",
                },
                cookies=cookies,
            )
            self.assertEqual(response.status_code, 200)
            session_id = response.json()["data"]["session"]["id"]
            await self.wait_for_terminal_run(session_id, cookies, "completed")

            session = (await self.async_request("GET", f"/api/sessions/{session_id}", cookies=cookies)).json()["data"]["session"]
            self.assertEqual(session["codex_thread_id"], "thread-new-123")

            messages = (await self.async_request("GET", f"/api/sessions/{session_id}/messages", cookies=cookies)).json()["data"]["items"]
            self.assertEqual(messages[-1]["text"], "answer: first prompt")

            resume = await self.async_request(
                "POST",
                f"/api/sessions/{session_id}/runs",
                json_body={"prompt": "second prompt"},
                cookies=cookies,
            )
            self.assertEqual(resume.status_code, 200)
            await self.wait_for_terminal_run(session_id, cookies, "completed")

            messages = (await self.async_request("GET", f"/api/sessions/{session_id}/messages", cookies=cookies)).json()["data"]["items"]
            self.assertEqual(messages[-1]["text"], "resumed: second prompt")

        asyncio.run(scenario())

    def test_create_session_creates_missing_workspace_directory(self) -> None:
        async def scenario() -> None:
            cookies = self.auth_cookies()
            nested_cwd = Path(self.settings.default_allowed_root) / "proj" / "feature" / "draft"
            self.assertFalse(nested_cwd.exists())

            response = await self.async_request(
                "POST",
                "/api/sessions",
                json_body={
                    "cwd": str(nested_cwd),
                    "prompt": "create nested workspace",
                },
                cookies=cookies,
            )
            self.assertEqual(response.status_code, 200)
            self.assertTrue(nested_cwd.is_dir())
            session = response.json()["data"]["session"]
            self.assertEqual(session["cwd"], str(nested_cwd))
            await self.wait_for_terminal_run(session["id"], cookies, "completed")

        asyncio.run(scenario())

    def test_busy_and_cancel(self) -> None:
        async def scenario() -> None:
            cookies = self.auth_cookies()
            response = await self.async_request(
                "POST",
                "/api/sessions",
                json_body={
                    "cwd": str(Path(self.settings.default_allowed_root) / "proj"),
                    "prompt": "please cancel",
                },
                cookies=cookies,
            )
            self.assertEqual(response.status_code, 200)
            session_id = response.json()["data"]["session"]["id"]
            run_id = response.json()["data"]["run"]["id"]

            await self.wait_for_terminal_run(session_id, cookies, "running", attempts=30)

            busy = await self.async_request(
                "POST",
                f"/api/sessions/{session_id}/runs",
                json_body={"prompt": "another prompt"},
                cookies=cookies,
            )
            self.assertEqual(busy.status_code, 409)

            cancelled = await self.async_request("POST", f"/api/runs/{run_id}/cancel", json_body={}, cookies=cookies)
            self.assertEqual(cancelled.status_code, 200)

            await self.wait_for_terminal_run(session_id, cookies, "cancelled")

        asyncio.run(scenario())

    def test_settings_drive_default_model_effort_and_terminal(self) -> None:
        async def scenario() -> None:
            cookies = self.auth_cookies()
            updated = await self.async_request(
                "POST",
                "/api/system/settings",
                json_body={
                    "model": "gpt-5.2",
                    "reasoning_effort": "xhigh",
                    "ui_language": "ja",
                    "terminal_app": "iterm",
                    "sandbox_mode": "danger-full-access",
                    "approval_policy": "never",
                    "git_write_enabled": True,
                    "git_write_sandbox_mode": "danger-full-access",
                    "git_write_approval_policy": "on-request",
                },
                cookies=cookies,
            )
            self.assertEqual(updated.status_code, 200)
            payload = updated.json()["data"]
            self.assertEqual(payload["settings"]["model"], "gpt-5.2")
            self.assertEqual(payload["settings"]["reasoning_effort"], "xhigh")
            self.assertEqual(payload["settings"]["ui_language"], "ja")
            self.assertEqual(payload["settings"]["terminal_app"], "iterm")
            self.assertEqual(payload["settings"]["sandbox_mode"], "danger-full-access")
            self.assertEqual(payload["settings"]["approval_policy"], "never")
            self.assertEqual(payload["settings"]["git_write_enabled"], True)
            self.assertEqual(payload["settings"]["git_write_sandbox_mode"], "danger-full-access")
            self.assertEqual(payload["settings"]["git_write_approval_policy"], "on-request")

            session_response = await self.async_request(
                "POST",
                "/api/sessions",
                json_body={
                    "cwd": str(Path(self.settings.default_allowed_root) / "proj"),
                    "prompt": "settings prompt",
                },
                cookies=cookies,
            )
            self.assertEqual(session_response.status_code, 200)
            session = session_response.json()["data"]["session"]
            self.assertEqual(session["model"], "gpt-5.2")
            await self.wait_for_terminal_run(session["id"], cookies, "completed")
            app_settings_text = self.settings.config_path.read_text(encoding="utf-8")
            self.assertIn('reasoning_effort = "xhigh"', app_settings_text)
            self.assertIn('ui_language = "ja"', app_settings_text)
            self.assertIn('terminal_app = "iterm"', app_settings_text)
            self.assertIn('sandbox_mode = "danger-full-access"', app_settings_text)
            self.assertIn('approval_policy = "never"', app_settings_text)
            self.assertIn("git_write_enabled = true", app_settings_text)
            self.assertIn('git_write_sandbox_mode = "danger-full-access"', app_settings_text)
            self.assertIn('git_write_approval_policy = "on-request"', app_settings_text)
            self.assertFalse(self.settings.codex_config_path.exists())

        asyncio.run(scenario())

    def test_runner_builds_commands_with_app_permissions(self) -> None:
        repository = self.app.state.repository
        repository.update_settings(
            model="gpt-5.4",
            reasoning_effort="high",
            terminal_app="terminal",
            sandbox_mode="danger-full-access",
            approval_policy="never",
        )

        new_session = self.app.state.store.create_session(
            cwd=str(Path(self.settings.default_allowed_root) / "proj"),
            model="gpt-5.4",
            title="new session",
        )
        new_run = self.app.state.store.create_run(new_session["id"], "new", "ship it")
        new_command = self.app.state.runner._build_command(self.app.state.store.get_session(new_session["id"]), new_run)
        self.assertEqual(
            new_command[:6],
            [self.settings.codex_bin, "--disable", "plugins", "--dangerously-bypass-approvals-and-sandbox", "exec", "--json"],
        )

        resume_session = self.app.state.store.create_session(
            cwd=str(Path(self.settings.default_allowed_root) / "proj"),
            model="gpt-5.4",
            title="resume session",
        )
        self.app.state.store.bind_thread_id(resume_session["id"], "thread-new-123")
        resume_run = self.app.state.store.create_run(resume_session["id"], "resume", "continue")
        resume_command = self.app.state.runner._build_command(self.app.state.store.get_session(resume_session["id"]), resume_run)
        self.assertEqual(
            resume_command[:7],
            [self.settings.codex_bin, "--disable", "plugins", "--dangerously-bypass-approvals-and-sandbox", "exec", "resume", "--json"],
        )

    def test_runner_uses_full_access_for_all_prompts(self) -> None:
        repository = self.app.state.repository
        repository.update_settings(
            model="gpt-5.4",
            reasoning_effort="high",
            terminal_app="terminal",
            sandbox_mode="workspace-write",
            approval_policy="never",
            git_write_enabled=True,
            git_write_sandbox_mode="danger-full-access",
            git_write_approval_policy="on-request",
        )

        session = self.app.state.store.create_session(
            cwd=str(Path(self.settings.default_allowed_root) / "proj"),
            model="gpt-5.4",
            title="git write",
        )

        safe_run = self.app.state.store.create_run(session["id"], "new", "show git status only")
        safe_command = self.app.state.runner._build_command(self.app.state.store.get_session(session["id"]), safe_run)
        self.assertEqual(
            safe_command[:6],
            [self.settings.codex_bin, "--disable", "plugins", "--dangerously-bypass-approvals-and-sandbox", "exec", "--json"],
        )

        git_write_session = self.app.state.store.create_session(
            cwd=str(Path(self.settings.default_allowed_root) / "proj"),
            model="gpt-5.4",
            title="git write commit",
        )
        git_write_run = self.app.state.store.create_run(git_write_session["id"], "new", "请帮我 git commit 当前改动")
        git_write_command = self.app.state.runner._build_command(self.app.state.store.get_session(git_write_session["id"]), git_write_run)
        self.assertEqual(
            git_write_command[:6],
            [self.settings.codex_bin, "--disable", "plugins", "--dangerously-bypass-approvals-and-sandbox", "exec", "--json"],
        )

    def test_open_terminal_uses_selected_terminal_app(self) -> None:
        async def scenario() -> None:
            cookies = self.auth_cookies()
            session_response = await self.async_request(
                "POST",
                "/api/sessions",
                json_body={
                    "cwd": str(Path(self.settings.default_allowed_root) / "proj"),
                    "prompt": "open me later",
                },
                cookies=cookies,
            )
            self.assertEqual(session_response.status_code, 200)
            session_id = session_response.json()["data"]["session"]["id"]
            await self.wait_for_terminal_run(session_id, cookies, "completed")

            updated = await self.async_request(
                "POST",
                "/api/system/settings",
                json_body={"terminal_app": "iterm", "sandbox_mode": "workspace-write", "approval_policy": "never"},
                cookies=cookies,
            )
            self.assertEqual(updated.status_code, 200)

            runner = self.app.state.runner
            with mock.patch("app.codex.sys.platform", "darwin"):
                with mock.patch.object(runner, "_run_applescript", new=mock.AsyncMock()) as applescript_mock:
                    response = await self.async_request(
                        "POST",
                        f"/api/sessions/{session_id}/open-terminal",
                        json_body={},
                        cookies=cookies,
                    )
            self.assertEqual(response.status_code, 200)
            payload = response.json()["data"]
            self.assertEqual(payload["terminal_app"], "iterm")
            applescript_mock.assert_awaited_once()
            script = applescript_mock.await_args.args[0]
            self.assertIn('tell application "iTerm"', script)
            self.assertIn("--disable plugins", script)
            self.assertIn("--dangerously-bypass-approvals-and-sandbox", script)
            self.assertIn("resume thread-new-123", script)

        asyncio.run(scenario())

    def test_open_terminal_uses_git_write_permissions_when_enabled(self) -> None:
        async def scenario() -> None:
            cookies = self.auth_cookies()
            session_response = await self.async_request(
                "POST",
                "/api/sessions",
                json_body={
                    "cwd": str(Path(self.settings.default_allowed_root) / "proj"),
                    "prompt": "open for commit",
                },
                cookies=cookies,
            )
            self.assertEqual(session_response.status_code, 200)
            session_id = session_response.json()["data"]["session"]["id"]
            await self.wait_for_terminal_run(session_id, cookies, "completed")

            updated = await self.async_request(
                "POST",
                "/api/system/settings",
                json_body={
                    "terminal_app": "iterm",
                    "sandbox_mode": "workspace-write",
                    "approval_policy": "never",
                    "git_write_enabled": True,
                    "git_write_sandbox_mode": "danger-full-access",
                    "git_write_approval_policy": "on-request",
                },
                cookies=cookies,
            )
            self.assertEqual(updated.status_code, 200)

            runner = self.app.state.runner
            with mock.patch("app.codex.sys.platform", "darwin"):
                with mock.patch.object(runner, "_run_applescript", new=mock.AsyncMock()) as applescript_mock:
                    response = await self.async_request(
                        "POST",
                        f"/api/sessions/{session_id}/open-terminal",
                        json_body={},
                        cookies=cookies,
                    )
            self.assertEqual(response.status_code, 200)
            payload = response.json()["data"]
            self.assertEqual(payload["permission_profile"], "managed_full_access")
            script = applescript_mock.await_args.args[0]
            self.assertIn("--disable plugins", script)
            self.assertIn("--dangerously-bypass-approvals-and-sandbox", script)

        asyncio.run(scenario())

    def test_permission_diagnostic_reports_runtime_mismatch(self) -> None:
        thread_id = "thread-perm-123"
        rollout_dir = self.settings.codex_dir / "sessions" / "2026" / "04" / "09"
        rollout_dir.mkdir(parents=True, exist_ok=True)
        rollout_path = rollout_dir / f"rollout-2026-04-09T00-00-00-{thread_id}.jsonl"
        rollout_path.write_text(
            textwrap.dedent(
                """
                {"type":"turn_context","payload":{"approval_policy":"never","sandbox_policy":{"type":"workspace-write"}}}
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )
        diagnostic = self.app.state.repository.permission_diagnostic(thread_id, "danger-full-access", "never")
        self.assertIn("requested sandbox=danger-full-access", diagnostic)
        self.assertIn("actual sandbox=workspace-write", diagnostic)

    def test_session_rename_delete_and_reorder(self) -> None:
        async def scenario() -> None:
            cookies = self.auth_cookies()
            first_response = await self.async_request(
                "POST",
                "/api/sessions",
                json_body={
                    "cwd": str(Path(self.settings.default_allowed_root) / "proj"),
                    "prompt": "first ordering prompt",
                },
                cookies=cookies,
            )
            self.assertEqual(first_response.status_code, 200)
            first_session_id = first_response.json()["data"]["session"]["id"]
            await self.wait_for_terminal_run(first_session_id, cookies, "completed")

            second_response = await self.async_request(
                "POST",
                "/api/sessions",
                json_body={
                    "cwd": str(Path(self.settings.default_allowed_root) / "proj"),
                    "prompt": "second ordering prompt",
                },
                cookies=cookies,
            )
            self.assertEqual(second_response.status_code, 200)
            second_session_id = second_response.json()["data"]["session"]["id"]
            await self.wait_for_terminal_run(second_session_id, cookies, "completed")

            renamed = await self.async_request(
                "PATCH",
                f"/api/sessions/{first_session_id}",
                json_body={"title": "Renamed Session"},
                cookies=cookies,
            )
            self.assertEqual(renamed.status_code, 200)
            self.assertEqual(renamed.json()["data"]["session"]["title"], "Renamed Session")

            reordered = await self.async_request(
                "POST",
                "/api/sessions/reorder",
                json_body={"session_ids": [second_session_id, first_session_id]},
                cookies=cookies,
            )
            self.assertEqual(reordered.status_code, 200)
            ordered_ids = [item["id"] for item in reordered.json()["data"]["sessions"][:2]]
            self.assertEqual(ordered_ids, [second_session_id, first_session_id])

            pinned = await self.async_request(
                "PATCH",
                f"/api/sessions/{first_session_id}",
                json_body={"pinned": True},
                cookies=cookies,
            )
            self.assertEqual(pinned.status_code, 200)
            self.assertTrue(pinned.json()["data"]["session"]["pinned"])

            sessions = await self.async_request("GET", "/api/sessions", cookies=cookies)
            listed_ids = [item["id"] for item in sessions.json()["data"]["items"][:2]]
            self.assertEqual(listed_ids, [first_session_id, second_session_id])

            deleted = await self.async_request(
                "DELETE",
                f"/api/sessions/{first_session_id}",
                cookies=cookies,
            )
            self.assertEqual(deleted.status_code, 200)

            sessions = await self.async_request("GET", "/api/sessions", cookies=cookies)
            remaining_ids = [item["id"] for item in sessions.json()["data"]["items"]]
            self.assertNotIn(first_session_id, remaining_ids)
            self.assertIn(second_session_id, remaining_ids)

        asyncio.run(scenario())

    def test_reconcile_stale_running_run_on_startup(self) -> None:
        session = self.app.state.store.create_session(
            cwd=str(Path(self.settings.default_allowed_root) / "proj"),
            model="gpt-5.4",
            title="stale session",
        )
        run = self.app.state.store.create_run(session["id"], "resume", "stale prompt")
        self.app.state.store.bind_thread_id(session["id"], "thread-stale-123")
        self.app.state.store.mark_run_started(run["id"], 999999)

        app = create_app(self.settings)
        repaired_run = app.state.store.get_run(run["id"])
        repaired_session = app.state.store.get_session(session["id"])

        self.assertEqual(repaired_run["status"], "failed")
        self.assertIn("Recovered stale running run after service restart", repaired_run["stderr_tail"])
        self.assertEqual(repaired_session["status"], "failed")

    def test_reconcile_stale_running_run_on_refresh(self) -> None:
        session = self.app.state.store.create_session(
            cwd=str(Path(self.settings.default_allowed_root) / "proj"),
            model="gpt-5.4",
            title="refresh stale session",
        )
        run = self.app.state.store.create_run(session["id"], "resume", "refresh stale prompt")
        self.app.state.store.bind_thread_id(session["id"], "thread-stale-refresh-123")
        self.app.state.store.mark_run_started(run["id"], 999999)

        response = self.client.get(f"/api/sessions/{session['id']}", cookies=self.auth_cookies())
        self.assertEqual(response.status_code, 200)

        repaired_run = self.app.state.store.get_run(run["id"])
        repaired_session = self.app.state.store.get_session(session["id"])
        self.assertEqual(repaired_run["status"], "failed")
        self.assertIn("Recovered stale running run during session refresh", repaired_run["stderr_tail"])
        self.assertEqual(repaired_session["status"], "failed")

    def test_session_snapshot_contract(self) -> None:
        async def scenario() -> None:
            session, _ = await self.app.state.runner.start_session(
                str(Path(self.settings.default_allowed_root) / "proj"),
                "gpt-5.4",
                "snapshot prompt",
            )
            snapshot = None
            for _ in range(20):
                snapshot = self.app.state.runner.session_snapshot(session["id"])
                if snapshot["events"]:
                    break
                await asyncio.sleep(0.1)
            self.assertIsNotNone(snapshot)
            self.assertEqual(snapshot["session"]["id"], session["id"])
            self.assertTrue(snapshot["runs"])
            self.assertTrue(snapshot["events"])
            self.assertIn(snapshot["events"][0]["event_type"], {"cli_log", "thread.started"})

        asyncio.run(scenario())

    def test_get_session_includes_current_branch(self) -> None:
        workspace = Path(self.settings.default_allowed_root) / "proj"
        subprocess.run(["git", "init"], cwd=workspace, check=True, capture_output=True)
        subprocess.run(["git", "checkout", "-b", "feature-branch-test"], cwd=workspace, check=True, capture_output=True)

        session = self.app.state.store.create_session(
            cwd=str(workspace),
            model="gpt-5.4",
            title="branch session",
        )
        response = self.client.get(f"/api/sessions/{session['id']}", cookies=self.auth_cookies())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["session"]["branch_name"], "feature-branch-test")


if __name__ == "__main__":
    unittest.main()
