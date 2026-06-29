# Telegram Manager

Monorepo gồm FastAPI backend và React frontend.

```
telegram-manager-api/
├── backend/     # FastAPI + Telethon
└── frontend/    # React dashboard
```

## Backend

```powershell
cd C:\tool\telegram-manager-api\backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Điền `TELEGRAM_API_ID` và `TELEGRAM_API_HASH` trong `.env` (lấy từ https://my.telegram.org).

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

API docs: http://127.0.0.1:8001/docs

## Frontend

```powershell
cd C:\tool\telegram-manager-api\frontend
npm install
npm run dev
```

Mở http://localhost:5173 — Vite proxy `/api` → `127.0.0.1:8001`.

## API có sẵn

- `POST /api/auth/send-code` — gửi OTP
- `POST /api/auth/login` — đăng nhập, tạo file `.session`
- `GET /api/sessions` — liệt kê session
- `POST /api/sessions/check` — kiểm tra session
- `GET /api/sessions/{phone}/me` — thông tin tài khoản