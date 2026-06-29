# Telegram Manager FastAPI

Ban FastAPI co ban de join group/channel Telegram bang Telethon.

Chi nen dung voi tai khoan cua ban va group/channel ban co quyen tham gia. Tool nay khong lam bulk join, khong ne FloodWait, va khong bypass captcha.

## Cai dat

```powershell
cd C:\tool\telegram-manager-api
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Mo `.env` va dien:

```env
TELEGRAM_API_ID=...
TELEGRAM_API_HASH=...
SESSION_DIR=C:\tool\session
```

## Chay server

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Mo docs:

```text
http://127.0.0.1:8001/docs
```

## API co san

- `GET /health`: kiem tra server, cau hinh Telegram, va thu muc session.
- `GET /sessions`: liet ke file `.session`.
- `POST /telegram/join-group`: join group/channel bang mot account.

Body mau:

```json
{
  "phone": "+849xxxxxxxx",
  "group_link": "https://t.me/example_group"
}
```

Invite link cung dung duoc:

```json
{
  "phone": "+849xxxxxxxx",
  "group_link": "https://t.me/+invite_hash"
}
```

Neu tra ve `Session chua dang nhap` hoac `Khong tim thay session`, can tao/login session Telethon truoc.
