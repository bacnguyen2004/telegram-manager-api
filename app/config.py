import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def resolve_project_path(value: str) -> Path:
    path = Path(value)
    if not path.is_absolute():
        path = BASE_DIR / path
    return path.resolve()


class Settings:
    app_name: str = "Telegram Manager API"
    api_prefix: str = "/api"

    telegram_api_id: int = int(os.getenv("TELEGRAM_API_ID", "0") or 0)
    telegram_api_hash: str = os.getenv("TELEGRAM_API_HASH", "")

    session_dir: Path = resolve_project_path(
        os.getenv("SESSION_FOLDER") or os.getenv("SESSION_DIR", "../session")
    )

    session_lock_timeout: float = float(os.getenv("TG_SESSION_LOCK_TIMEOUT", "180") or 180)
    session_lock_stale_seconds: float = float(
        os.getenv("TG_SESSION_LOCK_STALE_SECONDS", "1800") or 1800
    )
    session_lock_dir: Path = BASE_DIR / "runtime" / "locks" / "sessions"

    def validate_telegram_config(self) -> None:
        if not self.telegram_api_id or not self.telegram_api_hash:
            raise ValueError("Missing TELEGRAM_API_ID or TELEGRAM_API_HASH in .env")

    def ensure_runtime_dirs(self) -> None:
        self.session_dir.mkdir(parents=True, exist_ok=True)
        self.session_lock_dir.mkdir(parents=True, exist_ok=True)
        (BASE_DIR / "runtime").mkdir(parents=True, exist_ok=True)


settings = Settings()