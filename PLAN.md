# Kế hoạch phát triển — Telegram Manager API (FastAPI)

> Dựa trên Django `telegram_manager` (`C:\tool\telegram_manager`)  
> FastAPI: `telegram-manager-api` (đã đổi tên từ `telegram_manager_fastapi`)
> GitHub đề xuất: `telegram-manager-api` (private trước, public sau)

---

## 1. Định vị dự án

| | Django (`telegram-manager`) | FastAPI (`telegram-manager-api`) |
|---|---|---|
| **Vai trò** | Web UI + admin, thao tác trên trình duyệt | API-first, tích hợp tool/script/client khác |
| **Người dùng** | Thao tác qua giao diện | Gọi qua HTTP / OpenAPI / automation |
| **UI** | 27 trang HTML + Bootstrap | Không UI (hoặc thêm SPA sau) |
| **Hiện trạng** | ~50 API, Celery, 11 models, đầy đủ chức năng | 3 endpoint: health, sessions, join-group |

**Mục tiêu:** FastAPI đạt **parity về nghiệp vụ** với Django, nhưng kiến trúc sạch hơn — không copy nguyên 2400 dòng `views.py`.

**Nguyên tắc port từ Django:**

- Giữ logic Telethon đã chứng minh (`telegram_service.py`, `captcha_solver.py`, `rate_limit.py`…)
- Chuẩn hóa response API (Django đang mix `success` / `status`)
- Tách rõ: sync endpoint vs background task

---

## 2. Kiến trúc đề xuất

```
telegram_manager_api/
├── app/
│   ├── main.py                 # FastAPI app, mount routers
│   ├── config.py               # Settings từ .env
│   ├── db/
│   │   ├── base.py
│   │   ├── session.py          # SQLAlchemy async session
│   │   └── models/             # Port 11 models từ Django
│   ├── schemas/                # Pydantic request/response
│   ├── routers/                # API theo domain
│   │   ├── health.py
│   │   ├── sessions.py
│   │   ├── accounts.py
│   │   ├── auth.py
│   │   ├── groups.py
│   │   ├── messages.py
│   │   ├── profile.py
│   │   ├── proxy.py
│   │   ├── tasks.py
│   │   └── logs.py
│   ├── services/
│   │   ├── telegram/           # Port telegram_service.py
│   │   │   ├── client.py       # connect, session lock
│   │   │   ├── auth.py
│   │   │   ├── groups.py
│   │   │   ├── messages.py
│   │   │   └── ...
│   │   ├── rate_limit.py
│   │   ├── captcha_solver.py
│   │   ├── task_runner.py
│   │   └── app_settings.py
│   ├── workers/
│   │   ├── celery_app.py
│   │   └── tasks.py            # Port từ core/tasks.py
│   └── utils/
│       ├── session_lock.py
│       └── responses.py        # Envelope chuẩn
├── alembic/                    # DB migrations
├── runtime/                    # logs, uploads
├── tests/
├── .env.example
├── requirements.txt
├── README.md
└── PLAN.md                     # File này
```

### Stack đề xuất

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| ORM | SQLAlchemy 2.0 (async) | Tương đương Django ORM, dễ port models |
| DB | SQLite → PostgreSQL | SQLite đủ dev; production nên PostgreSQL |
| Background | Celery + Redis | Giữ như Django, port task logic trực tiếp |
| Telethon | Giữ async native | FastAPI async — bỏ `run_async()` wrapper của Django |
| Auth API | API key / JWT (tùy chọn) | Django đang mở hoàn toàn; FastAPI nên có ít nhất API key |

### Response envelope chuẩn

```json
{
  "success": true,
  "data": { },
  "error": null
}
```

Task async:

```json
{
  "success": true,
  "data": {
    "task_id": 42,
    "status": "running",
    "poll_url": "/api/tasks/42/status"
  }
}
```

---

## 3. Inventory Django (tham chiếu)

### Models (11)

| Model | Mục đích |
|---|---|
| `TelegramAccount` | Tài khoản TG: phone, profile, health status |
| `AccountIdentity` | Liên kết identity ngoài (email/UID/platform) |
| `ActionLog` | Nhật ký hoạt động |
| `CopyState` | Chống copy trùng message |
| `CopyHistory` | Lịch sử copy message |
| `AccountProxy` | Proxy per account |
| `RateLimitRule` | Rule rate limit per action |
| `AccountRateState` | Trạng thái rate limit per account |
| `AppSetting` | KV settings (session folder paths) |
| `TaskRun` | Bulk task metadata |
| `TaskRunLog` | Log realtime từng dòng task |

### Celery tasks

| Task | Mô tả |
|---|---|
| `run_action_task` | Bulk actions chính (join, message, reply, copy…) |
| `run_health_check_task` | Health check hàng loạt |
| `run_session_check_task` | Kiểm tra session + sync profile |
| `run_proxy_check_task` | Test proxy từng account |

### Feature Django (đầy đủ)

- Dashboard tổng quan
- Đăng nhập / Đăng ký / 2FA / Lấy mã xác thực
- Sessions: xem, kiểm tra, xóa
- Hồ sơ & thiết bị
- Privacy settings
- Join / Leave nhóm hàng loạt
- Gửi tin + Reply hàng loạt
- Reactions & Vote poll
- Nhật ký hoạt động
- Chats viewer, Bots, Voice chat
- Copy messages, Conversation script, Hashtag scan
- Auto Profile, Profile sync, Health check
- Proxy management, Rate limiting
- Session folders, Account identities
- Captcha solver, Task center (pause/stop/retry)

### Biến môi trường Django (cần port)

| Biến | Mô tả |
|---|---|
| `TELEGRAM_API_ID` | Telegram API ID |
| `TELEGRAM_API_HASH` | Telegram API hash |
| `SESSION_FOLDER` | Folder session active |
| `INACTIVE_SESSION_FOLDER` | Folder session inactive |
| `CELERY_BROKER_URL` | Redis broker |
| `CELERY_RESULT_BACKEND` | Redis result backend |
| `TG_SESSION_LOCK_TIMEOUT` | Session lock timeout |
| `TG_SESSION_LOCK_STALE_SECONDS` | Stale lock cleanup |

---

## 4. Roadmap theo phase

### Phase 0 — Nền tảng (1–2 tuần) ← **hiện tại**

Mục tiêu: skeleton production-ready.

- [x] Đổi tên → `telegram-manager-api`
- [ ] Init git + `.gitignore` (thêm `*.session`)
- [ ] Tạo cấu trúc thư mục `routers/`, `services/`, `db/`
- [ ] SQLAlchemy + Alembic, port 11 models từ Django
- [ ] `config.py` mở rộng: `SESSION_FOLDER`, `INACTIVE_SESSION_FOLDER`, Celery URLs
- [ ] Response envelope + exception handler
- [ ] Health check đầy đủ (DB, Redis, session dir)
- [ ] Di chuyển `join-group` sang `routers/groups.py`

**Deliverable:** Repo chạy được, có DB, OpenAPI docs, 1 endpoint Telegram hoạt động.

---

### Phase 1 — Session & Account (2 tuần)

Map Django: `sessions`, `session-folders`, `accounts/meta`, `check-sessions`

| Endpoint | Django tương ứng |
|---|---|
| `GET /api/sessions` | sessions page |
| `POST /api/sessions/check` | `/api/check-sessions/` |
| `DELETE /api/sessions/{phone}` | `/api/delete-session/` |
| `GET/PUT /api/session-folders` | session-folders |
| `GET /api/accounts` | accounts meta |
| `GET /api/accounts/{phone}` | account-info |

**Port service:**

- Session file lock (cross-process)
- Session compat migration
- Inactive folder move
- `TelegramAccount` CRUD + sync từ session files

---

### Phase 2 — Auth & Security (2 tuần)

Map Django: `auth`, `login-codes`, `2fa`, `privacy`

| Endpoint | Chức năng |
|---|---|
| `POST /api/auth/send-code` | Gửi OTP |
| `POST /api/auth/login` | Login + 2FA |
| `POST /api/auth/register` | Đăng ký mới |
| `GET /api/auth/login-code/{phone}` | Đọc mã từ Telegram |
| `PUT /api/auth/2fa` | Đổi 2FA |
| `PUT /api/auth/privacy` | Privacy invite |

> Auth Telegram (Telethon) ≠ auth API. Phase này là đăng nhập tài khoản Telegram qua API.

---

### Phase 3 — Groups cơ bản (2 tuần)

Map Django: `groups`, một phần `chats`

| Endpoint | Mode |
|---|---|
| `POST /api/groups/join` | sync (đã có, thêm captcha + proxy) |
| `POST /api/groups/leave` | sync |
| `POST /api/groups/leave-all` | task |
| `GET /api/groups/{phone}` | sync — danh sách nhóm |
| `GET /api/dialogs/{phone}` | sync |
| `GET /api/dialogs/{phone}/messages` | sync |

**Port:** `captcha_solver.py`, proxy precheck, rate limit `join_group`.

---

### Phase 4 — Task system (2–3 tuần) ← **xương sống bulk**

Map Django: `tasks.py`, `task_runner.py`

| Endpoint | Chức năng |
|---|---|
| `POST /api/tasks/action` | Start bulk (join, message, reply…) |
| `GET /api/tasks/{id}/status` | Poll progress + logs |
| `GET /api/tasks/{id}` | Chi tiết |
| `POST /api/tasks/{id}/stop` | Dừng |
| `POST /api/tasks/{id}/pause` | Tạm dừng |
| `POST /api/tasks/{id}/resume` | Tiếp tục |
| `POST /api/tasks/{id}/retry-errors` | Retry lỗi |
| `GET /api/tasks` | Lịch sử |

**action_type cần support (theo thứ tự ưu tiên):**

1. `join_group` / `leave_group`
2. `send_message` / `reply`
3. `health_check` / `session_check` / `proxy_check`
4. `send_reaction` / `send_vote`
5. `copy_message` / `conversation`
6. `auto_profile` / `profile_sync`
7. `hashtag_scan` / `join_voice` / `join_bot`

---

### Phase 5 — Messaging & Engagement (2 tuần)

| Nhóm | Endpoints |
|---|---|
| Messages | send, reply, delete, upload photo |
| Reactions | send reaction |
| Vote | get poll options, send vote |
| Copy | copy-latest, preview, reset-state |

---

### Phase 6 — Profile & Infrastructure (2 tuần)

| Nhóm | Endpoints |
|---|---|
| Profile | update profile, avatar, devices, logout |
| Auto profile | preview, start task |
| Proxy | save, batch-assign, test, delete |
| Rate limit | save rule, reset state |
| Health | sync + task |
| Identities | save, delete |
| Logs | `GET /api/logs` với filter |

---

### Phase 7 — Hoàn thiện & GitHub (1 tuần)

- [ ] Test cơ bản (pytest + httpx)
- [ ] README đầy đủ + bảng mapping Django ↔ FastAPI
- [ ] Docker Compose (api + redis + worker)
- [ ] Public repo `telegram-manager-api`
- [ ] (Tùy chọn) OpenAPI client generator

---

## 5. Ma trận ưu tiên

```
Cao  │ Phase 0 → 1 → 3 → 4 (join bulk)
     │         ↘ 2 (auth) nếu cần tạo session mới qua API
Thấp │ Phase 5 → 6 → 7
```

**Lý do:** Join group bulk + task system là lõi Django; làm xong Phase 0–4 là đã dùng được ~70% giá trị.

---

## 6. Chiến lược port code từ Django

| Module Django | Cách port |
|---|---|
| `telegram_service.py` | Chia nhỏ theo domain, **bỏ** `run_async()` — dùng `await` trực tiếp |
| `tasks.py` | Giữ logic, đổi ORM calls |
| `rate_limit.py` | Gần như copy nguyên |
| `captcha_solver.py` | Copy nguyên |
| `profile_generator.py` + `profile_pools.py` | Copy nguyên |
| `app_settings.py` | Đổi Django model → SQLAlchemy |
| `views.py` | **Không port** — viết lại thành routers + schemas |
| Templates/static | **Không port** — FastAPI là API-only |

### Khác biệt khi port Telethon

```python
# Django (sync wrapper)
def join_group(self, phone, link):
    return run_async(self._join_group(phone, link))

# FastAPI (native async)
async def join_group(self, phone, link):
    async with self._client(phone) as client:
        ...
```

---

## 7. Quan hệ với Django sau này

| Hướng | Mô tả |
|---|---|
| **A. Song song** | Django = UI, FastAPI = API cho script/tool khác |
| **B. Django gọi FastAPI** | Django UI giữ nguyên, backend dần chuyển sang FastAPI |
| **C. Thay thế** | FastAPI đủ feature → bỏ Django, thêm SPA sau |

**Khuyến nghị hiện tại:** Hướng A — ít rủi ro, Django vẫn chạy ổn.

---

## 8. GitHub

| Project | Repo |
|---|---|
| Django | `github.com/bacnguyen2004/telegram-manager` (đã có) |
| FastAPI | `telegram-manager-api` (chưa tạo) |

**Chiến lược:**

1. Tạo repo **private** ngay khi bắt Phase 0
2. Commit từ đầu, không cần đợi đủ chức năng
3. Public khi Phase 0–1 xong (README + `.gitignore` + không lộ secret)

**Trước khi push:**

- `.gitignore` phải chặn: `.env`, `venv/`, `*.session`, `runtime/`
- Không commit session Telegram

---

## 9. Việc làm ngay (tuần này)

1. ~~Đổi tên thư mục → `telegram-manager-api`~~ (xong)
2. Tạo repo GitHub private `telegram-manager-api`
3. Phase 0: cấu trúc + DB models + response chuẩn
4. Refactor `join-group` vào `routers/groups.py`
5. Port `session_lock` + mở rộng `config.py`

---

## 10. Timeline ước lượng

| Phase | Thời gian | Cumulative |
|---|---|---|
| 0 — Nền tảng | 1–2 tuần | 2 tuần |
| 1 — Sessions | 2 tuần | 4 tuần |
| 2 — Auth | 2 tuần | 6 tuần |
| 3 — Groups | 2 tuần | 8 tuần |
| 4 — Tasks | 2–3 tuần | 11 tuần |
| 5 — Messages | 2 tuần | 13 tuần |
| 6 — Profile/Infra | 2 tuần | 15 tuần |
| 7 — Polish | 1 tuần | **~4 tháng** |

Làm part-time có thể kéo dài 5–6 tháng.

---

## 11. Mapping endpoint Django → FastAPI (tham chiếu đầy đủ)

### Account & Identity

| Django | FastAPI (đề xuất) |
|---|---|
| `GET /api/accounts/meta/` | `GET /api/accounts` |
| `POST /api/identities/save/` | `PUT /api/identities/{phone}` |
| `POST /api/identities/delete/` | `DELETE /api/identities/{phone}` |

### Session & Folders

| Django | FastAPI (đề xuất) |
|---|---|
| `POST /api/check-sessions/` | `POST /api/sessions/check` |
| `POST /api/delete-session/` | `DELETE /api/sessions/{phone}` |
| `POST /api/session-folders/save/` | `PUT /api/session-folders` |
| `POST /api/session-folders/reload/` | `POST /api/session-folders/reload` |

### Tasks

| Django | FastAPI (đề xuất) |
|---|---|
| `POST /api/tasks/action/start/` | `POST /api/tasks/action` |
| `POST /api/tasks/health-check/start/` | `POST /api/tasks/health-check` |
| `POST /api/tasks/session-check/start/` | `POST /api/tasks/session-check` |
| `POST /api/tasks/proxy-check/start/` | `POST /api/tasks/proxy-check` |
| `POST /api/tasks/auto-profile/start/` | `POST /api/tasks/auto-profile` |
| `GET /api/tasks/<id>/status/` | `GET /api/tasks/{id}/status` |
| `GET /api/tasks/<id>/detail/` | `GET /api/tasks/{id}` |
| `POST /api/tasks/<id>/stop/` | `POST /api/tasks/{id}/stop` |
| `POST /api/tasks/<id>/pause/` | `POST /api/tasks/{id}/pause` |
| `POST /api/tasks/<id>/resume/` | `POST /api/tasks/{id}/resume` |
| `POST /api/tasks/<id>/retry-errors/` | `POST /api/tasks/{id}/retry-errors` |

### Groups & Chats

| Django | FastAPI (đề xuất) |
|---|---|
| `POST /api/join-group/` | `POST /api/groups/join` |
| `POST /api/leave-group/` | `POST /api/groups/leave` |
| `POST /api/leave-all-groups/` | `POST /api/groups/leave-all` |
| `GET /api/get-joined-groups/<phone>/` | `GET /api/groups/{phone}` |
| `GET /api/dialogs/<phone>/` | `GET /api/dialogs/{phone}` |
| `GET /api/dialog-messages/<phone>/` | `GET /api/dialogs/{phone}/messages` |

### Messages & Actions

| Django | FastAPI (đề xuất) |
|---|---|
| `POST /api/send-message/` | `POST /api/messages/send` |
| `POST /api/reply-message/` | `POST /api/messages/reply` |
| `POST /api/send-reaction/` | `POST /api/reactions/send` |
| `POST /api/send-vote/` | `POST /api/votes/send` |
| `POST /api/copy-latest-message/` | `POST /api/copy/latest` |
| `POST /api/health-check/` | `POST /api/health/check` |

---

*Cập nhật lần cuối: 2026-06-29*