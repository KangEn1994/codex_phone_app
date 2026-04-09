from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any

from fastapi import Cookie, FastAPI, HTTPException, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .codex import CodexCliRunner, CodexRepository
from .config import APPROVAL_POLICIES, PASSWORD_MIN_LENGTH, SANDBOX_MODES, TERMINAL_APPS, Settings, coerce_bool, static_asset_version
from .store import SessionStore


def api_ok(data: Any) -> dict[str, Any]:
    return {"ok": True, "data": data}


def create_app(settings: Settings | None = None) -> FastAPI:
    base_dir = Path(__file__).resolve().parent.parent
    app_settings = settings or Settings.from_env(base_dir)
    store = SessionStore(app_settings)
    repository = CodexRepository(app_settings)
    runner = CodexCliRunner(app_settings, store, repository)
    runner.reconcile_incomplete_runs()

    app = FastAPI(title="Codex CLI Web Console", version="1.0.0")
    templates = Jinja2Templates(directory=str(app_settings.base_dir / "templates"))
    app.mount("/static", StaticFiles(directory=str(app_settings.base_dir / "static")), name="static")

    app.state.settings = app_settings
    app.state.store = store
    app.state.repository = repository
    app.state.runner = runner
    app.state.templates = templates

    @app.exception_handler(HTTPException)
    async def handle_http_exception(_: Request, exc: HTTPException) -> JSONResponse:
        detail = exc.detail
        if isinstance(detail, dict) and "code" in detail and "message" in detail:
            body = {"ok": False, "error": detail}
        else:
            body = {"ok": False, "error": {"code": "INTERNAL_ERROR", "message": str(detail)}}
        return JSONResponse(body, status_code=exc.status_code)

    def require_user(session_token: str | None) -> dict[str, Any]:
        return store.current_user(session_token)

    @app.get("/", response_class=HTMLResponse)
    async def index(request: Request) -> HTMLResponse:
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "asset_version": static_asset_version(app_settings.base_dir)},
        )

    @app.get("/api/health")
    async def health() -> dict[str, Any]:
        return api_ok({"status": "ok"})

    @app.post("/api/auth/login")
    async def login(payload: dict[str, Any], response: Response) -> dict[str, Any]:
        username = str(payload.get("username") or "").strip()
        password = str(payload.get("password") or "")
        if username != app_settings.login_username or not store.verify_login_password(password):
            raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Authentication required"})
        token = store.create_auth_session()
        response.set_cookie(
            key=app_settings.session_cookie,
            value=token,
            httponly=True,
            samesite="lax",
            secure=False,
            max_age=60 * 60 * 8,
        )
        return api_ok({"user": store.user})

    @app.post("/api/auth/logout")
    async def logout(response: Response, session_token: str | None = Cookie(default=None, alias=app_settings.session_cookie)) -> dict[str, Any]:
        store.clear_auth_session(session_token)
        response.delete_cookie(app_settings.session_cookie)
        return api_ok({"logged_out": True})

    @app.get("/api/auth/me")
    async def me(session_token: str | None = Cookie(default=None, alias=app_settings.session_cookie)) -> dict[str, Any]:
        return api_ok({"user": require_user(session_token)})

    @app.post("/api/auth/password")
    async def change_password(payload: dict[str, Any], session_token: str | None = Cookie(default=None, alias=app_settings.session_cookie)) -> dict[str, Any]:
        require_user(session_token)
        current_password = str(payload.get("current_password") or "")
        new_password = str(payload.get("new_password") or "")
        confirm_password = str(payload.get("confirm_password") or "")

        if not store.verify_login_password(current_password):
            raise HTTPException(status_code=400, detail={"code": "INVALID_PASSWORD", "message": "当前密码不正确"})
        if len(new_password) < PASSWORD_MIN_LENGTH:
            raise HTTPException(status_code=400, detail={"code": "INVALID_REQUEST", "message": f"新密码至少需要 {PASSWORD_MIN_LENGTH} 位"})
        if len(new_password) > 128:
            raise HTTPException(status_code=400, detail={"code": "INVALID_REQUEST", "message": "新密码过长"})
        if new_password != confirm_password:
            raise HTTPException(status_code=400, detail={"code": "INVALID_REQUEST", "message": "两次输入的新密码不一致"})
        if new_password == current_password:
            raise HTTPException(status_code=400, detail={"code": "INVALID_REQUEST", "message": "新密码不能与当前密码相同"})

        store.update_login_password(new_password)
        return api_ok({"updated": True})

    @app.get("/api/system/status")
    async def system_status(session_token: str | None = Cookie(default=None, alias=app_settings.session_cookie)) -> dict[str, Any]:
        require_user(session_token)
        return api_ok(repository.system_status(store.count_active_runs()))

    @app.post("/api/system/settings")
    async def update_system_settings(payload: dict[str, Any], session_token: str | None = Cookie(default=None, alias=app_settings.session_cookie)) -> dict[str, Any]:
        require_user(session_token)
        model = str(payload.get("model") or "").strip()
        reasoning_effort = str(payload.get("reasoning_effort") or "").strip().lower()
        terminal_app = str(payload.get("terminal_app") or "").strip().lower()
        sandbox_mode = str(payload.get("sandbox_mode") or "").strip().lower()
        approval_policy = str(payload.get("approval_policy") or "").strip().lower()
        git_write_enabled_raw = payload.get("git_write_enabled")
        git_write_sandbox_mode = str(payload.get("git_write_sandbox_mode") or "").strip().lower()
        git_write_approval_policy = str(payload.get("git_write_approval_policy") or "").strip().lower()
        git_write_enabled = None if git_write_enabled_raw is None else coerce_bool(git_write_enabled_raw)
        if model and len(model) > 120:
            raise HTTPException(status_code=400, detail={"code": "INVALID_REQUEST", "message": "Model name is too long"})
        if reasoning_effort and reasoning_effort not in {"low", "medium", "high", "xhigh"}:
            raise HTTPException(status_code=400, detail={"code": "INVALID_REQUEST", "message": "reasoning_effort must be low, medium, high, or xhigh"})
        if terminal_app and terminal_app not in TERMINAL_APPS:
            raise HTTPException(status_code=400, detail={"code": "INVALID_REQUEST", "message": f"terminal_app must be one of: {', '.join(TERMINAL_APPS)}"})
        if sandbox_mode and sandbox_mode not in SANDBOX_MODES:
            raise HTTPException(status_code=400, detail={"code": "INVALID_REQUEST", "message": f"sandbox_mode must be one of: {', '.join(SANDBOX_MODES)}"})
        if approval_policy and approval_policy not in APPROVAL_POLICIES:
            raise HTTPException(status_code=400, detail={"code": "INVALID_REQUEST", "message": f"approval_policy must be one of: {', '.join(APPROVAL_POLICIES)}"})
        if git_write_enabled_raw is not None and git_write_enabled is None:
            raise HTTPException(status_code=400, detail={"code": "INVALID_REQUEST", "message": "git_write_enabled must be a boolean"})
        if git_write_sandbox_mode and git_write_sandbox_mode not in SANDBOX_MODES:
            raise HTTPException(status_code=400, detail={"code": "INVALID_REQUEST", "message": f"git_write_sandbox_mode must be one of: {', '.join(SANDBOX_MODES)}"})
        if git_write_approval_policy and git_write_approval_policy not in APPROVAL_POLICIES:
            raise HTTPException(status_code=400, detail={"code": "INVALID_REQUEST", "message": f"git_write_approval_policy must be one of: {', '.join(APPROVAL_POLICIES)}"})
        updated = repository.update_settings(
            model=model,
            reasoning_effort=reasoning_effort,
            terminal_app=terminal_app,
            sandbox_mode=sandbox_mode,
            approval_policy=approval_policy,
            git_write_enabled=git_write_enabled,
            git_write_sandbox_mode=git_write_sandbox_mode,
            git_write_approval_policy=git_write_approval_policy,
        )
        return api_ok({"settings": updated, "status": repository.system_status(store.count_active_runs())})

    @app.get("/api/projects")
    async def projects(session_token: str | None = Cookie(default=None, alias=app_settings.session_cookie)) -> dict[str, Any]:
        require_user(session_token)
        return api_ok({"items": repository.allowed_workspaces()})

    @app.get("/api/sessions")
    async def sessions(session_token: str | None = Cookie(default=None, alias=app_settings.session_cookie)) -> dict[str, Any]:
        require_user(session_token)
        return api_ok({"items": store.list_sessions()})

    @app.post("/api/sessions/reorder")
    async def reorder_sessions(payload: dict[str, Any], session_token: str | None = Cookie(default=None, alias=app_settings.session_cookie)) -> dict[str, Any]:
        require_user(session_token)
        session_ids = payload.get("session_ids")
        if not isinstance(session_ids, list):
            raise HTTPException(status_code=400, detail={"code": "INVALID_REQUEST", "message": "session_ids must be an array"})
        updated = store.reorder_sessions(session_ids)
        return api_ok({"items": updated, "sessions": store.list_sessions()})

    @app.post("/api/sessions")
    async def create_session(payload: dict[str, Any], session_token: str | None = Cookie(default=None, alias=app_settings.session_cookie)) -> dict[str, Any]:
        require_user(session_token)
        cwd = str(payload.get("cwd") or "").strip()
        prompt = str(payload.get("prompt") or "").strip()
        model = repository.default_model()
        if not cwd:
            raise HTTPException(status_code=400, detail={"code": "INVALID_REQUEST", "message": "cwd is required"})
        session, run = await runner.start_session(cwd=cwd, model=model, prompt=prompt)
        return api_ok({"session": session, "run": run})

    @app.get("/api/sessions/{session_id}")
    async def get_session(session_id: str, session_token: str | None = Cookie(default=None, alias=app_settings.session_cookie)) -> dict[str, Any]:
        require_user(session_token)
        return api_ok({"session": store.get_session(session_id)})

    @app.patch("/api/sessions/{session_id}")
    async def update_session(session_id: str, payload: dict[str, Any], session_token: str | None = Cookie(default=None, alias=app_settings.session_cookie)) -> dict[str, Any]:
        require_user(session_token)
        title = str(payload.get("title") or "").strip()
        if not title:
            raise HTTPException(status_code=400, detail={"code": "INVALID_REQUEST", "message": "title is required"})
        if len(title) > 120:
            raise HTTPException(status_code=400, detail={"code": "INVALID_REQUEST", "message": "title is too long"})
        session = store.update_session_title(session_id, title)
        return api_ok({"session": session})

    @app.delete("/api/sessions/{session_id}")
    async def delete_session(session_id: str, session_token: str | None = Cookie(default=None, alias=app_settings.session_cookie)) -> dict[str, Any]:
        require_user(session_token)
        store.delete_session(session_id)
        return api_ok({"deleted": True, "session_id": session_id, "sessions": store.list_sessions()})

    @app.get("/api/sessions/{session_id}/messages")
    async def get_session_messages(session_id: str, session_token: str | None = Cookie(default=None, alias=app_settings.session_cookie)) -> dict[str, Any]:
        require_user(session_token)
        session = store.get_session(session_id)
        messages = repository.get_messages(session["codex_thread_id"]) if session["codex_thread_id"] else []
        return api_ok({"session_id": session_id, "items": messages})

    @app.get("/api/sessions/{session_id}/runs")
    async def get_session_runs(session_id: str, session_token: str | None = Cookie(default=None, alias=app_settings.session_cookie)) -> dict[str, Any]:
        require_user(session_token)
        return api_ok({"session_id": session_id, "items": store.list_runs(session_id)})

    @app.post("/api/sessions/{session_id}/runs")
    async def create_run(session_id: str, payload: dict[str, Any], session_token: str | None = Cookie(default=None, alias=app_settings.session_cookie)) -> dict[str, Any]:
        require_user(session_token)
        prompt = str(payload.get("prompt") or "").strip()
        session, run = await runner.resume_session(session_id=session_id, prompt=prompt)
        return api_ok({"session": session, "run": run})

    @app.post("/api/runs/{run_id}/cancel")
    async def cancel_run(run_id: str, session_token: str | None = Cookie(default=None, alias=app_settings.session_cookie)) -> dict[str, Any]:
        require_user(session_token)
        run_data = await runner.cancel_run(run_id)
        return api_ok({"run": run_data})

    @app.post("/api/sessions/{session_id}/open-terminal")
    async def open_session_in_terminal(session_id: str, session_token: str | None = Cookie(default=None, alias=app_settings.session_cookie)) -> dict[str, Any]:
        require_user(session_token)
        result = await runner.open_session_in_terminal(session_id)
        return api_ok(result)

    @app.websocket("/api/sessions/{session_id}/events")
    async def session_events(websocket: WebSocket, session_id: str) -> None:
        token = websocket.cookies.get(app_settings.session_cookie)
        try:
            store.current_user(token)
            store.get_session(session_id)
        except HTTPException:
            await websocket.close(code=4401)
            return

        await websocket.accept()
        await websocket.send_json({"event": "session.snapshot", "data": runner.session_snapshot(session_id)})
        queue = runner.subscribe(session_id)
        try:
            while True:
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=20)
                except TimeoutError:
                    await websocket.send_json({"event": "ping", "data": {}})
                    continue
                await websocket.send_json(payload)
        except WebSocketDisconnect:
            pass
        finally:
            runner.unsubscribe(session_id, queue)

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
