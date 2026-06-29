# Telegram Manager

![CI](https://github.com/bacnguyen2004/telegram-manager-api/actions/workflows/ci.yml/badge.svg)

Monorepo **FastAPI + React** — quản lý tài khoản Telegram qua HTTP API và dashboard web. Backend dùng **Telethon**, có **session lock** an toàn khi nhiều request, **Docker Compose** để clone là chạy.

```
telegram-manager-api/
├── backend/     # FastAPI + Telethon (port 8001)
└── frontend/    # React + Vite (port 5173, proxy /api)
```

GitHub: https://github.com/bacnguyen2004/telegram-manager-api

---

## GitHub About (copy vào repo Settings)

**Description:**

```
FastAPI + React dashboard for Telegram account management via Telethon — sessions, groups, dialogs, messaging (send/reply/delete). Docker-ready.
```

**Topics:** `fastapi` `react` `telethon` `telegram` `typescript` `docker` `vite` `pytest`

---

## Screenshots

| Dashboard — API map | Dialogs — chat UI | Sessions |
|---|---|---|
| ![Dashboard](docs/screenshots/dashboard.svg) | ![Dialogs](docs/screenshots/dialogs.svg) | ![Sessions](docs/screenshots/sessions.svg) |

> Thay bằng ảnh chụp thật: xem [docs/screenshots/README.md](docs/screenshots/README.md).

---

## How to demo (clone → chạy)

**Mục tiêu:** người khác clone repo là chạy được trong vài phút.

### 1. Chuẩn bị Telegram API

Lấy `TELEGRAM_API_ID` và `TELEGRAM_API_HASH` tại https://my.telegram.org

### 2. Backend (Docker — khuyến nghị)

```powershell
# Từ repo root
copy backend\.env.example backend\.env
# Điền TELEGRAM_API_ID + TELEGRAM_API_HASH vào backend\.env

docker compose up --build
```

- Swagger: http://127.0.0.1:8001/docs
- Health: http://127.0.0.1:8001/api/health

### 3. Đăng nhập (chưa có session)

Trong Swagger `/docs`:

1. `POST /api/auth/send-code` — gửi OTP tới app Telegram
2. `POST /api/auth/login` — nhập OTP → tạo file `.session`
3. `GET /api/sessions` — xác nhận `total >= 1`

> Đăng nhập Telegram trên điện thoại **không** tự tạo session cho API.

**Copy session vào Docker** (nếu đăng nhập local trước đó):

```powershell
docker compose cp backend\runtime\sessions\. api:/app/runtime/sessions/
```

### 4. Frontend dashboard

```powershell
cd frontend
npm install
npm run dev
```

Mở http://localhost:5173 → **Dialogs** → chọn phone → đọc/gửi/reply/xóa tin.

Proxy `/api` mặc định trỏ `http://127.0.0.1:8001`. Đổi port: tạo `frontend/.env.local` với `VITE_API_PROXY_TARGET=http://127.0.0.1:<port>`.

---

## Yêu cầu

- Python 3.11+ (dev local) hoặc Docker
- Node.js 18+ (frontend)
- `TELEGRAM_API_ID` + `TELEGRAM_API_HASH`

---

## Backend (dev local)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Điền `.env` (xem **Biến môi trường**).

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

### Chạy test

```powershell
pip install -r requirements-dev.txt
pytest
```

Chạy từ thư mục `backend` (sau `venv\Scripts\activate`). CI tự chạy pytest trên mỗi push/PR.

Test gồm: health, sessions, messages/send, reply, **send-media**, **delete** (mock Telethon), session lock.

---

## Docker

```powershell
docker compose up --build    # foreground
docker compose up -d         # background
docker compose down
```

- API: http://127.0.0.1:8001/docs
- Session files trong volume `telegram-sessions`

---

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

Mở http://localhost:5173 — Vite proxy `/api` → backend (mặc định port **8001**).

---

## Biến môi trường (backend `.env`)

| Biến | Mô tả | Mặc định |
|---|---|---|
| `TELEGRAM_API_ID` | API ID từ my.telegram.org | — |
| `TELEGRAM_API_HASH` | API hash | — |
| `SESSION_FOLDER` | Thư mục file `.session` | `runtime/sessions` |
| `SESSION_LOCK_DIR` | Thư mục file lock | `runtime/locks` |
| `TG_SESSION_LOCK_TIMEOUT` | Chờ lock tối đa (giây) | `120` |
| `TG_SESSION_LOCK_STALE_SECONDS` | Xóa lock file cũ (crash) | `300` |

---

## Session lock

Mỗi tài khoản (`phone`) map tới một file `.session` (SQLite). Telethon **không an toàn** khi nhiều request mở cùng file song song.

**Giải pháp:** `session_lock` — mỗi phone chỉ một kết nối Telethon tại một thời điểm.

| Lớp | Phạm vi |
|---|---|
| `asyncio.Lock` | Nhiều request trong cùng process FastAPI |
| File `runtime/locks/{phone}.lock` | Nhiều process / worker |

Tất cả service dùng helper `telethon_session()` (lock → connect → yield client → disconnect → release).

---

## API — 22 endpoint

Response chuẩn: `{ "success": true|false, "data": ..., "error": null|"..." }`

### Health

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/health` | Trạng thái backend, Telegram config, session dir |

### Sessions

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/sessions` | Liệt kê session (file `.session` trên disk) |
| POST | `/api/sessions/check` | Kiểm tra live/unauthorized |
| GET | `/api/sessions/{phone}` | Chi tiết 1 session |
| DELETE | `/api/sessions/{phone}` | Xóa session file |
| GET | `/api/sessions/{phone}/me` | Thông tin tài khoản Telegram |

### Auth

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/auth/send-code` | Gửi OTP |
| POST | `/api/auth/login` | Đăng nhập (+ 2FA) |
| POST | `/api/auth/register` | Đăng ký mới |
| GET | `/api/auth/login-code/{phone}` | Đọc OTP từ Telegram |
| PUT | `/api/auth/2fa` | Đổi mật khẩu 2FA |
| PUT | `/api/auth/privacy` | Cài privacy invite |

### Groups

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/groups/join` | Join nhóm/channel |
| POST | `/api/groups/leave` | Rời 1 nhóm |
| POST | `/api/groups/leave-all` | Rời tất cả nhóm/channel |
| GET | `/api/groups/{phone}` | Danh sách nhóm đã join |

### Dialogs & Messages

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/dialogs/{phone}` | Tất cả chat (private, bot, group, channel) |
| GET | `/api/dialogs/{phone}/messages` | Đọc tin nhắn 1 chat (`?peer_id=&limit=`) |
| POST | `/api/messages/send` | Gửi tin text (`phone`, `peer_id`, `text`) |
| POST | `/api/messages/reply` | Trả lời tin (`phone`, `peer_id`, `reply_to_msg_id`, `text`) |
| POST | `/api/messages/send-media` | Gửi ảnh (`multipart`: `phone`, `peer_id`, `file`, `caption?`, `reply_to_msg_id?`) |
| DELETE | `/api/messages/{message_id}` | Xóa tin (`?phone=&peer_id=`) |

---

## Kiến trúc backend

```
app/
├── main.py
├── config.py              # settings + session_lock singleton
├── routers/               # HTTP layer
├── schemas/               # Pydantic request/response
├── services/telegram/     # Telethon logic
│   └── client.py          # telethon_session() — lock + connect
└── utils/
    ├── responses.py       # envelope { success, data, error }
    └── session_lock.py    # per-phone file lock
```

---

## Frontend pages

| Route | Trang |
|---|---|
| `/` | Dashboard — bản đồ API |
| `/sessions` | Quản lý session |
| `/groups` | Join / leave / list |
| `/dialogs` | Chat + gửi/reply/ảnh/xóa tin |
| `/login`, `/register`, … | Auth flow |
| `/health` | Health check |

---

## Roadmap

- [x] Auth, sessions, groups, dialogs
- [x] messages/send, reply, **send-media**, **delete**
- [x] Session lock, React dashboard
- [x] pytest, GitHub Actions CI, Docker Compose
- [ ] Task system (bulk join/send)