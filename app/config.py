from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
import tomllib
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


MODEL_SUGGESTIONS = [
    "gpt-5.4",
    "gpt-5.3-codex",
    "gpt-5.2",
    "gpt-5.2-codex",
    "gpt-5.1-codex-max",
    "gpt-5.1",
    "gpt-5",
    "gpt-4.1",
    "o4-mini",
]
REASONING_EFFORTS = ["low", "medium", "high", "xhigh"]
TERMINAL_APPS = ["terminal", "iterm"]
SANDBOX_MODES = ["read-only", "workspace-write", "danger-full-access"]
APPROVAL_POLICIES = ["untrusted", "on-request", "never"]
SUPPORTED_UI_LANGUAGES = ["zh-CN", "zh-TW", "en", "ja", "ko", "ar", "ru", "th"]
DEFAULT_UI_LANGUAGE = "zh-CN"
PASSWORD_MIN_LENGTH = 6
PASSWORD_PBKDF2_ITERATIONS = 200_000
GIT_WRITE_INTENT_PATTERN = re.compile(
    r"(?:"
    r"\bgit\s+(?:add|commit|merge|rebase|cherry-pick|stash|tag|branch|switch|checkout|restore|reset|revert|push|commit-tree)\b"
    r"|(?:\bcommit\b|\bamend\b|\brebase\b|\bstash\b|\bcherry-pick\b)"
    r"|提交"
    r"|git提交"
    r"|暂存(?:更改|修改|文件)?"
    r"|推送"
    r"|分支"
    r"|变基"
    r"|打(?:tag|标签)"
    r")",
    re.IGNORECASE,
)


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def to_iso_utc(value: int | float | str | None) -> str:
    if value is None:
        return now_iso()
    if isinstance(value, str):
        stripped = value.strip()
        if stripped.endswith("Z"):
            return stripped
        try:
            parsed = datetime.fromisoformat(stripped.replace("Z", "+00:00"))
        except ValueError:
            return stripped
        return parsed.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    ts = float(value)
    if ts > 10_000_000_000:
        ts /= 1000
    return datetime.fromtimestamp(ts, timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def make_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


def static_asset_version(base_dir: Path) -> str:
    latest = 0
    for rel_path in ("static/app.js", "static/styles.css"):
        try:
            latest = max(latest, int((base_dir / rel_path).stat().st_mtime))
        except OSError:
            continue
    return str(latest or int(datetime.now(timezone.utc).timestamp()))


def shutil_which(binary: str) -> str | None:
    for directory in os.getenv("PATH", "").split(os.pathsep):
        candidate = Path(directory) / binary
        if candidate.exists() and os.access(candidate, os.X_OK):
            return str(candidate)
    return None


def resolve_codex_binary() -> str | None:
    preferred = os.getenv("CODEXAPP_CODEX_BIN")
    candidates = [preferred, "/Applications/Codex.app/Contents/Resources/codex", shutil_which("codex")]
    for candidate in candidates:
        if not candidate:
            continue
        path = Path(candidate).expanduser()
        if path.exists() and os.access(path, os.X_OK):
            return str(path)
    return None


def detect_codex_version(binary: str | None) -> str:
    if not binary:
        return ""
    try:
        result = subprocess.run(
            [binary, "--version"],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return ""
    return (result.stdout or result.stderr).strip()


def read_text_parts(content: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    for item in content:
        text = item.get("text")
        if text:
            parts.append(str(text))
    return "".join(parts).strip()


def is_environment_message(text: str) -> bool:
    stripped = str(text or "").strip()
    return stripped.startswith("<environment_context>") and stripped.endswith("</environment_context>")


def is_internal_harness_message(text: str) -> bool:
    stripped = str(text or "").strip()
    return stripped.startswith("# AGENTS.md instructions") or stripped.startswith("<permissions instructions>")


def is_visible_user_message(text: str) -> bool:
    return bool(text) and not is_environment_message(text) and not is_internal_harness_message(text)


def is_smoke_test_prompt(text: str) -> bool:
    stripped = str(text or "").strip()
    if not stripped:
        return False
    normalized = re.sub(r"\s+", " ", stripped).strip().lower()
    return bool(
        re.fullmatch(r"reply with ok only\.?", normalized)
        or re.fullmatch(r"reply with exactly ok\.?", normalized)
        or normalized.startswith("visibility-check ")
        or normalized.startswith("browser-visible-check ")
        or normalized.startswith("index-check ")
    )


def is_git_write_request(text: str) -> bool:
    stripped = str(text or "").strip()
    if not stripped:
        return False
    normalized = re.sub(r"\s+", " ", stripped)
    return bool(GIT_WRITE_INTENT_PATTERN.search(normalized))


def prompt_title(text: str) -> str:
    first_line = (str(text or "").strip().splitlines() or ["新会话"])[0].strip()
    title = first_line or "新会话"
    return title[:120]


def session_token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def load_toml(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        with path.open("rb") as handle:
            data = tomllib.load(handle)
    except (OSError, tomllib.TOMLDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def _toml_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def _toml_scalar(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return str(value)
    return f'"{_toml_escape(str(value))}"'


def dump_toml(data: dict[str, Any]) -> str:
    lines: list[str] = []

    def write_table(table: dict[str, Any], prefix: tuple[str, ...] = ()) -> None:
        scalars: list[tuple[str, Any]] = []
        children: list[tuple[str, dict[str, Any]]] = []
        for key, value in table.items():
            if isinstance(value, dict):
                children.append((key, value))
            else:
                scalars.append((key, value))

        if prefix:
            if lines and lines[-1] != "":
                lines.append("")
            lines.append(f"[{'.'.join(prefix)}]")

        for key, value in scalars:
            lines.append(f"{key} = {_toml_scalar(value)}")

        for key, value in children:
            write_table(value, prefix + (key,))

    write_table(data)
    return "\n".join(lines).strip() + "\n"


def save_toml(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(dump_toml(data), encoding="utf-8")


def coerce_bool(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    if value is None:
        return None
    normalized = str(value).strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return None


def _hash_password(password: str, salt_hex: str) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt_hex),
        PASSWORD_PBKDF2_ITERATIONS,
    ).hex()


def password_record(password: str, username: str) -> dict[str, Any]:
    salt_hex = os.urandom(16).hex()
    return {
        "version": 1,
        "username": username,
        "salt": salt_hex,
        "password_hash": _hash_password(password, salt_hex),
    }


def verify_password_record(password: str, record: dict[str, Any]) -> bool:
    salt = str(record.get("salt") or "").strip()
    password_hash = str(record.get("password_hash") or "").strip()
    if len(salt) != 32 or not password_hash:
        return False
    return _hash_password(password, salt) == password_hash


@dataclass(slots=True)
class Settings:
    base_dir: Path
    home: Path
    codex_dir: Path
    state_db: Path
    session_index: Path
    config_path: Path
    codex_config_path: Path
    app_support_dir: Path
    app_db: Path
    auth_state_file: Path
    session_cookie: str
    session_cookie_secure: bool | None
    login_username: str
    login_password: str
    default_allowed_root: str
    codex_bin: str | None
    codex_version: str

    @staticmethod
    def legacy_app_support_dir(home: Path) -> Path:
        return home / "Library" / "Application Support" / "CodexApp"

    @staticmethod
    def migrate_legacy_app_support(legacy_dir: Path, target_dir: Path) -> None:
        if legacy_dir == target_dir or not legacy_dir.exists():
            return
        target_dir.mkdir(parents=True, exist_ok=True)
        for filename in ("settings.toml", "app.db"):
            source = legacy_dir / filename
            target = target_dir / filename
            if source.exists() and not target.exists():
                try:
                    shutil.copy2(source, target)
                except OSError:
                    continue

    @classmethod
    def from_env(cls, base_dir: Path) -> "Settings":
        home = Path(os.getenv("HOME", str(Path.home()))).expanduser()
        codex_dir = Path(os.getenv("CODEXAPP_CODEX_DIR", str(home / ".codex"))).expanduser()
        configured_support_dir = os.getenv("CODEXAPP_SUPPORT_DIR")
        app_support_dir = Path(configured_support_dir or str(base_dir / ".codexapp")).expanduser()
        if not configured_support_dir:
            cls.migrate_legacy_app_support(cls.legacy_app_support_dir(home), app_support_dir)
        auth_state_file = Path(os.getenv("CODEXAPP_AUTH_STATE_FILE", str(codex_dir / "codexapp_auth.json"))).expanduser()
        codex_bin = resolve_codex_binary()
        return cls(
            base_dir=base_dir,
            home=home,
            codex_dir=codex_dir,
            state_db=codex_dir / "state_5.sqlite",
            session_index=codex_dir / "session_index.jsonl",
            config_path=app_support_dir / "settings.toml",
            codex_config_path=codex_dir / "config.toml",
            app_support_dir=app_support_dir,
            app_db=Path(os.getenv("CODEXAPP_DB_PATH", str(app_support_dir / "app.db"))).expanduser(),
            auth_state_file=auth_state_file,
            session_cookie="codexapp_session",
            session_cookie_secure=coerce_bool(os.getenv("CODEXAPP_SESSION_COOKIE_SECURE")),
            login_username=os.getenv("CODEXAPP_USERNAME", "admin"),
            login_password=os.getenv("CODEXAPP_PASSWORD", "codexapp-demo"),
            default_allowed_root=os.getenv("CODEXAPP_ALLOWED_ROOT", str(home / "codex")),
            codex_bin=codex_bin,
            codex_version=detect_codex_version(codex_bin),
        )
