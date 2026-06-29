import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from starlette.testclient import TestClient

from app.main import app


def main() -> None:
    with TestClient(app) as client:
        for path in ["/", "/api/sessions", "/docs"]:
            response = client.get(path)
            if path == "/docs":
                print(path, response.status_code, "html")
            else:
                print(path, response.status_code, response.json())


if __name__ == "__main__":
    main()