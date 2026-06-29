from pydantic import BaseModel


class SessionsData(BaseModel):
    session_dir: str
    inactive_session_dir: str
    count: int
    sessions: list[str]