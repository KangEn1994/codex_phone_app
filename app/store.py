from __future__ import annotations

import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from secrets import compare_digest
from threading import RLock
from typing import Any

from fastapi import HTTPException

from .config import (
    PASSWORD_MIN_LENGTH,
    Settings,
    make_id,
    now_iso,
    password_record,
    prompt_title,
    session_token_hash,
    verify_password_record,
)


class SessionStore:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._lock = RLock()
        self.settings.app_support_dir.mkdir(parents=True, exist_ok=True)
        self._init_db()

    @property
    def user(self) -> dict[str, Any]:
        return {
            "id": "usr_local",
            "username": self.settings.login_username,
            "created_at": "2026-04-08T05:00:00Z",
        }

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(str(self.settings.app_db))
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    @contextmanager
    def _connection(self) -> Any:
        connection = self._connect()
        try:
            yield connection
        finally:
            connection.close()

    def _init_db(self) -> None:
        with self._connection() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS managed_sessions (
                    id TEXT PRIMARY KEY,
                    codex_thread_id TEXT,
                    cwd TEXT NOT NULL,
                    model TEXT NOT NULL,
                    title TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    last_run_id TEXT,
                    sort_index INTEGER NOT NULL DEFAULT 0
                );

                CREATE TABLE IF NOT EXISTS session_runs (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    type TEXT NOT NULL,
                    prompt TEXT NOT NULL,
                    status TEXT NOT NULL,
                    pid INTEGER,
                    exit_code INTEGER,
                    final_message TEXT,
                    stderr_tail TEXT,
                    created_at TEXT NOT NULL,
                    started_at TEXT,
                    completed_at TEXT,
                    FOREIGN KEY(session_id) REFERENCES managed_sessions(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS session_events (
                    id TEXT PRIMARY KEY,
                    run_id TEXT NOT NULL,
                    seq INTEGER NOT NULL,
                    event_type TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(run_id) REFERENCES session_runs(id) ON DELETE CASCADE
                );

                CREATE UNIQUE INDEX IF NOT EXISTS idx_session_events_run_seq
                ON session_events(run_id, seq);

                CREATE INDEX IF NOT EXISTS idx_managed_sessions_updated_at
                ON managed_sessions(updated_at DESC, id DESC);

                CREATE INDEX IF NOT EXISTS idx_session_runs_session_created_at
                ON session_runs(session_id, created_at DESC, id DESC);

                CREATE TABLE IF NOT EXISTS auth_sessions (
                    token_hash TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL
                );
                """
            )
            columns = {
                row["name"]
                for row in connection.execute("PRAGMA table_info(managed_sessions)").fetchall()
            }
            if "sort_index" not in columns:
                connection.execute("ALTER TABLE managed_sessions ADD COLUMN sort_index INTEGER NOT NULL DEFAULT 0")
            rows = connection.execute(
                """
                SELECT id
                FROM managed_sessions
                WHERE sort_index = 0
                ORDER BY updated_at DESC, id DESC
                """
            ).fetchall()
            for index, row in enumerate(rows, start=1):
                connection.execute(
                    "UPDATE managed_sessions SET sort_index = ? WHERE id = ?",
                    (index, row["id"]),
                )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_managed_sessions_sort_index
                ON managed_sessions(sort_index ASC, updated_at DESC, id DESC)
                """
            )
            connection.commit()

    def _load_auth_state(self) -> dict[str, Any] | None:
        if not self.settings.auth_state_file.exists():
            return None
        try:
            data = json.loads(self.settings.auth_state_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return None
        return data if isinstance(data, dict) else None

    def _save_auth_state(self, data: dict[str, Any]) -> None:
        self.settings.auth_state_file.parent.mkdir(parents=True, exist_ok=True)
        self.settings.auth_state_file.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    def verify_login_password(self, password: str) -> bool:
        record = self._load_auth_state()
        if record:
            return verify_password_record(password, record)
        return compare_digest(password, self.settings.login_password)

    def update_login_password(self, new_password: str) -> None:
        self._save_auth_state(password_record(new_password, self.settings.login_username))

    def delete_expired_auth_sessions(self) -> None:
        with self._connection() as connection:
            connection.execute("DELETE FROM auth_sessions WHERE expires_at <= ?", (now_iso(),))
            connection.commit()

    def create_auth_session(self) -> str:
        token = uuid.uuid4().hex
        created_at = now_iso()
        expires_at = (
            datetime.now(timezone.utc).replace(microsecond=0) + timedelta(hours=8)
        ).isoformat().replace("+00:00", "Z")
        with self._connection() as connection:
            connection.execute(
                """
                INSERT INTO auth_sessions (token_hash, user_id, created_at, expires_at)
                VALUES (?, ?, ?, ?)
                """,
                (session_token_hash(token), self.user["id"], created_at, expires_at),
            )
            connection.commit()
        return token

    def clear_auth_session(self, token: str | None) -> None:
        if not token:
            return
        with self._connection() as connection:
            connection.execute("DELETE FROM auth_sessions WHERE token_hash = ?", (session_token_hash(token),))
            connection.commit()

    def current_user(self, token: str | None) -> dict[str, Any]:
        self.delete_expired_auth_sessions()
        if not token:
            raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Authentication required"})
        with self._connection() as connection:
            row = connection.execute(
                """
                SELECT user_id
                FROM auth_sessions
                WHERE token_hash = ? AND expires_at > ?
                """,
                (session_token_hash(token), now_iso()),
            ).fetchone()
        if row is None:
            raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Authentication required"})
        return self.user

    def _row_to_run(self, row: sqlite3.Row | None) -> dict[str, Any] | None:
        if row is None:
            return None
        return {
            "id": row["id"],
            "session_id": row["session_id"],
            "type": row["type"],
            "prompt": row["prompt"],
            "status": row["status"],
            "pid": row["pid"],
            "exit_code": row["exit_code"],
            "final_message": row["final_message"],
            "stderr_tail": row["stderr_tail"] or "",
            "created_at": row["created_at"],
            "started_at": row["started_at"],
            "completed_at": row["completed_at"],
        }

    def _row_to_session(self, row: sqlite3.Row, latest_run: dict[str, Any] | None = None) -> dict[str, Any]:
        return {
            "id": row["id"],
            "codex_thread_id": row["codex_thread_id"] or "",
            "cwd": row["cwd"],
            "model": row["model"],
            "title": row["title"],
            "status": row["status"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "last_run_id": row["last_run_id"],
            "sort_index": row["sort_index"],
            "busy": row["status"] in {"queued", "running"},
            "latest_run": latest_run,
        }

    def _latest_run(self, connection: sqlite3.Connection, run_id: str | None) -> dict[str, Any] | None:
        if not run_id:
            return None
        row = connection.execute("SELECT * FROM session_runs WHERE id = ?", (run_id,)).fetchone()
        return self._row_to_run(row)

    def list_sessions(self) -> list[dict[str, Any]]:
        with self._connection() as connection:
            rows = connection.execute(
                """
                SELECT *
                FROM managed_sessions
                ORDER BY sort_index ASC, updated_at DESC, id DESC
                """
            ).fetchall()
            items = [self._row_to_session(row, self._latest_run(connection, row["last_run_id"])) for row in rows]
        return items

    def get_session(self, session_id: str) -> dict[str, Any]:
        with self._connection() as connection:
            row = connection.execute("SELECT * FROM managed_sessions WHERE id = ?", (session_id,)).fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Session not found"})
            return self._row_to_session(row, self._latest_run(connection, row["last_run_id"]))

    def create_session(self, cwd: str, model: str, title: str | None = None) -> dict[str, Any]:
        session_id = make_id("sess")
        created_at = now_iso()
        with self._connection() as connection:
            row = connection.execute("SELECT COALESCE(MAX(sort_index), 0) + 1 AS next_sort_index FROM managed_sessions").fetchone()
            sort_index = int(row["next_sort_index"] if row else 1)
            connection.execute(
                """
                INSERT INTO managed_sessions (id, codex_thread_id, cwd, model, title, status, created_at, updated_at, last_run_id, sort_index)
                VALUES (?, '', ?, ?, ?, 'ready', ?, ?, NULL, ?)
                """,
                (session_id, cwd, model, title or "新会话", created_at, created_at, sort_index),
            )
            connection.commit()
        return self.get_session(session_id)

    def create_run(self, session_id: str, run_type: str, prompt: str) -> dict[str, Any]:
        if run_type not in {"new", "resume"}:
            raise HTTPException(status_code=400, detail={"code": "INVALID_REQUEST", "message": "Invalid run type"})
        prompt_text = str(prompt or "").strip()
        if not prompt_text:
            raise HTTPException(status_code=400, detail={"code": "INVALID_REQUEST", "message": "Prompt is required"})
        created_at = now_iso()
        run_id = make_id("run")
        with self._lock:
            with self._connection() as connection:
                session_row = connection.execute("SELECT * FROM managed_sessions WHERE id = ?", (session_id,)).fetchone()
                if session_row is None:
                    raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Session not found"})
                busy = connection.execute(
                    """
                    SELECT id
                    FROM session_runs
                    WHERE session_id = ? AND status IN ('queued', 'running')
                    LIMIT 1
                    """,
                    (session_id,),
                ).fetchone()
                if busy is not None:
                    raise HTTPException(status_code=409, detail={"code": "CONFLICT", "message": "Session already has a running run"})
                connection.execute(
                    """
                    INSERT INTO session_runs (
                        id, session_id, type, prompt, status, pid, exit_code, final_message,
                        stderr_tail, created_at, started_at, completed_at
                    ) VALUES (?, ?, ?, ?, 'queued', NULL, NULL, NULL, '', ?, NULL, NULL)
                    """,
                    (run_id, session_id, run_type, prompt_text, created_at),
                )
                connection.execute(
                    """
                    UPDATE managed_sessions
                    SET status = 'queued', updated_at = ?, last_run_id = ?, title = CASE
                        WHEN title = '' OR title = '新会话' THEN ?
                        ELSE title
                    END
                    WHERE id = ?
                    """,
                    (created_at, run_id, prompt_title(prompt_text), session_id),
                )
                connection.commit()
        return self.get_run(run_id)

    def get_run(self, run_id: str) -> dict[str, Any]:
        with self._connection() as connection:
            row = connection.execute("SELECT * FROM session_runs WHERE id = ?", (run_id,)).fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Run not found"})
            run = self._row_to_run(row)
        return run

    def list_runs(self, session_id: str, limit: int = 30) -> list[dict[str, Any]]:
        self.get_session(session_id)
        with self._connection() as connection:
            rows = connection.execute(
                """
                SELECT *
                FROM session_runs
                WHERE session_id = ?
                ORDER BY created_at DESC, id DESC
                LIMIT ?
                """,
                (session_id, limit),
            ).fetchall()
        return [self._row_to_run(row) for row in rows]

    def count_active_runs(self) -> int:
        with self._connection() as connection:
            row = connection.execute(
                "SELECT COUNT(*) AS count FROM session_runs WHERE status IN ('queued', 'running')"
            ).fetchone()
        return int(row["count"] if row else 0)

    def list_active_runs(self) -> list[dict[str, Any]]:
        with self._connection() as connection:
            rows = connection.execute(
                """
                SELECT *
                FROM session_runs
                WHERE status IN ('queued', 'running')
                ORDER BY created_at DESC, id DESC
                """
            ).fetchall()
        return [self._row_to_run(row) for row in rows]

    def mark_run_started(self, run_id: str, pid: int) -> dict[str, Any]:
        started_at = now_iso()
        with self._connection() as connection:
            row = connection.execute("SELECT session_id FROM session_runs WHERE id = ?", (run_id,)).fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Run not found"})
            session_id = row["session_id"]
            connection.execute(
                """
                UPDATE session_runs
                SET status = 'running', pid = ?, started_at = ?
                WHERE id = ?
                """,
                (pid, started_at, run_id),
            )
            connection.execute(
                """
                UPDATE managed_sessions
                SET status = 'running', updated_at = ?, last_run_id = ?
                WHERE id = ?
                """,
                (started_at, run_id, session_id),
            )
            connection.commit()
        return self.get_run(run_id)

    def bind_thread_id(self, session_id: str, thread_id: str) -> dict[str, Any]:
        with self._connection() as connection:
            connection.execute(
                """
                UPDATE managed_sessions
                SET codex_thread_id = ?, updated_at = ?
                WHERE id = ?
                """,
                (thread_id, now_iso(), session_id),
            )
            connection.commit()
        return self.get_session(session_id)

    def update_session_title(self, session_id: str, title: str) -> dict[str, Any]:
        clean = str(title or "").strip()
        if not clean:
            return self.get_session(session_id)
        with self._connection() as connection:
            connection.execute(
                "UPDATE managed_sessions SET title = ?, updated_at = ? WHERE id = ?",
                (clean[:120], now_iso(), session_id),
            )
            connection.commit()
        return self.get_session(session_id)

    def delete_session(self, session_id: str) -> None:
        with self._lock:
            with self._connection() as connection:
                row = connection.execute("SELECT status FROM managed_sessions WHERE id = ?", (session_id,)).fetchone()
                if row is None:
                    raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Session not found"})
                if row["status"] in {"queued", "running"}:
                    raise HTTPException(status_code=409, detail={"code": "CONFLICT", "message": "Session has a running run"})
                connection.execute("DELETE FROM managed_sessions WHERE id = ?", (session_id,))
                connection.commit()

    def reorder_sessions(self, session_ids: list[str]) -> list[dict[str, Any]]:
        normalized: list[str] = []
        seen: set[str] = set()
        for raw in session_ids:
            session_id = str(raw or "").strip()
            if not session_id or session_id in seen:
                continue
            normalized.append(session_id)
            seen.add(session_id)
        if len(normalized) < 2:
            raise HTTPException(status_code=400, detail={"code": "INVALID_REQUEST", "message": "At least two unique session ids are required"})

        with self._lock:
            with self._connection() as connection:
                placeholders = ",".join("?" for _ in normalized)
                rows = connection.execute(
                    f"""
                    SELECT id, sort_index
                    FROM managed_sessions
                    WHERE id IN ({placeholders})
                    """,
                    tuple(normalized),
                ).fetchall()
                if len(rows) != len(normalized):
                    raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Session not found"})
                positions = sorted(int(row["sort_index"]) for row in rows)
                for sort_index, session_id in zip(positions, normalized):
                    connection.execute(
                        "UPDATE managed_sessions SET sort_index = ? WHERE id = ?",
                        (sort_index, session_id),
                    )
                connection.commit()
        return [self.get_session(session_id) for session_id in normalized]

    def update_session_model(self, session_id: str, model: str) -> dict[str, Any]:
        clean = str(model or "").strip()
        if not clean:
            return self.get_session(session_id)
        with self._connection() as connection:
            connection.execute(
                "UPDATE managed_sessions SET model = ?, updated_at = ? WHERE id = ?",
                (clean, now_iso(), session_id),
            )
            connection.commit()
        return self.get_session(session_id)

    def append_event(self, run_id: str, event_type: str, payload: dict[str, Any]) -> dict[str, Any]:
        created_at = now_iso()
        event_id = make_id("evt")
        payload_json = json.dumps(payload, ensure_ascii=False)
        with self._connection() as connection:
            row = connection.execute("SELECT COALESCE(MAX(seq), 0) + 1 AS next_seq FROM session_events WHERE run_id = ?", (run_id,)).fetchone()
            seq = int(row["next_seq"] if row else 1)
            connection.execute(
                """
                INSERT INTO session_events (id, run_id, seq, event_type, payload_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (event_id, run_id, seq, event_type, payload_json, created_at),
            )
            connection.commit()
        return {
            "id": event_id,
            "run_id": run_id,
            "seq": seq,
            "event_type": event_type,
            "payload": payload,
            "created_at": created_at,
        }

    def list_events(self, run_id: str, limit: int = 200) -> list[dict[str, Any]]:
        with self._connection() as connection:
            rows = connection.execute(
                """
                SELECT *
                FROM (
                    SELECT *
                    FROM session_events
                    WHERE run_id = ?
                    ORDER BY seq DESC
                    LIMIT ?
                )
                ORDER BY seq ASC
                """,
                (run_id, limit),
            ).fetchall()
        items: list[dict[str, Any]] = []
        for row in rows:
            try:
                payload = json.loads(row["payload_json"])
            except json.JSONDecodeError:
                payload = {"raw": row["payload_json"]}
            items.append(
                {
                    "id": row["id"],
                    "run_id": row["run_id"],
                    "seq": row["seq"],
                    "event_type": row["event_type"],
                    "payload": payload,
                    "created_at": row["created_at"],
                }
            )
        return items

    def finalize_run(
        self,
        run_id: str,
        status: str,
        exit_code: int | None,
        final_message: str | None,
        stderr_tail: str,
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        completed_at = now_iso()
        if status not in {"completed", "failed", "cancelled"}:
            raise HTTPException(status_code=400, detail={"code": "INVALID_REQUEST", "message": "Invalid run status"})
        session_status = "failed" if status == "failed" else "ready"
        with self._connection() as connection:
            row = connection.execute("SELECT session_id FROM session_runs WHERE id = ?", (run_id,)).fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Run not found"})
            session_id = row["session_id"]
            connection.execute(
                """
                UPDATE session_runs
                SET status = ?, exit_code = ?, final_message = ?, stderr_tail = ?, completed_at = ?
                WHERE id = ?
                """,
                (status, exit_code, final_message, stderr_tail, completed_at, run_id),
            )
            connection.execute(
                """
                UPDATE managed_sessions
                SET status = ?, updated_at = ?, last_run_id = ?
                WHERE id = ?
                """,
                (session_status, completed_at, run_id, session_id),
            )
            connection.commit()
        return self.get_session(session_id), self.get_run(run_id)

    def cancel_queued_run(self, run_id: str) -> tuple[dict[str, Any], dict[str, Any]]:
        run = self.get_run(run_id)
        if run["status"] != "queued":
            raise HTTPException(status_code=409, detail={"code": "CONFLICT", "message": "Run is not queued"})
        return self.finalize_run(run_id, "cancelled", None, run["final_message"], "Cancelled before start")

    def session_snapshot(self, session_id: str) -> dict[str, Any]:
        session = self.get_session(session_id)
        runs = self.list_runs(session_id)
        focus_run = next((run for run in runs if run["status"] in {"queued", "running"}), runs[0] if runs else None)
        events = self.list_events(focus_run["id"]) if focus_run else []
        return {"session": session, "runs": runs, "events": events}
