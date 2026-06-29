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
| **Hiện trạng** | ~50 API, Celery, 11 models, đầy đủ chức năng | 3 endpoint: send-code, login, sessions |

**Mục tiêu:** FastAPI đạt **parity về nghiệp vụ** với Django, nhưng kiến trúc sạch hơn — không copy nguyên 2400 dòng `views.py`.

**Nguyên tắc port từ Django:**

- Giữ logic Telethon đã chứng minh (`telegram_service.py`, `captcha_solver.py`, `rate_limit.py`…)
- Chuẩn hóa response API (Django đang mix `success` / `status`)
- Tách rõ: sync endpoint vs background task

---

## 2. Lộ trình học — Intern / Fresher (đọc trước)

> **Mục tiêu:** Học từ dễ → khó trên chính project này, đủ kỹ năng để **xin intern/fresher Backend/Python**.
>
> **Quy tắc vàng:** Đọc code theo `routers → services → utils`. Bỏ qua `app/db/models/` cho đến Level 3.
>
> Phần **Roadmap kỹ thuật (mục 5)** và **Mapping Django (mục 11)** là tài liệu tham chiếu — không cần học hết lúc đầu.

### Bản đồ nhanh

```
Level 1 (1 tuần)     Đọc hiểu API đang chạy          ← BẠN Ở ĐÂY
Level 2 (1–2 tuần)   Viết thêm endpoint đơn giản
Level 3 (2 tuần)     Database + CRUD
Level 4 (2 tuần)     Tích hợp dịch vụ ngoài (Telegram)
Level 5 (2–3 tuần)   Background job (Celery)
Level 6 (1–2 tuần)   Test + Docker + đóng gói portfolio
```

| Level | Học gì | Đọc file nào | Làm gì trên project | Kỹ năng CV |
|---|---|---|---|---|
| **1 — Nền tảng** | REST, FastAPI, cấu trúc layer | `main.py` → `routers/` → `utils/responses.py` | Chạy server, gọi `/docs`, giải thích 1 request join | FastAPI, REST, OpenAPI |
| **2 — API cơ bản** | Router, Pydantic schema, exception | `schemas/`, `utils/exceptions.py`, `config.py` | Tự viết `GET /api/ping` hoặc mở rộng `/api/sessions` | Request validation, HTTP status |
| **3 — Database** | SQLAlchemy async, CRUD, migration | `db/session.py`, `db/models/account.py` | Implement Phase 1: `POST /api/sessions/check` | ORM, SQLite, Alembic |
| **4 — Tích hợp** | Async I/O, error handling, lock file | `services/telegram/`, `utils/session_lock.py` | Phase 2–3: auth, leave group, list dialogs | Async Python, third-party API |
| **5 — Background** | Redis, Celery, task polling | `db/models/tasks.py`, (sẽ thêm) `workers/` | Phase 4: bulk join + poll status | Message queue, job system |
| **6 — Portfolio** | pytest, Docker, README, Git | `tests/`, `docker-compose.yml` | Phase 7: test + public GitHub | CI mindset, deploy cơ bản |

### Level 1 — Đọc hiểu (tuần 1) ← **Phase 0 gọn — bắt đầu từ đây**

**Mục tiêu:** Giải thích được project cho người phỏng vấn trong 2 phút.

**Chỉ đọc 6 file (theo thứ tự):**

1. `app/main.py` — setup steps khi chưa có session
2. `app/config.py` — đọc biến từ `.env`
3. `app/routers/auth.py` — send-code, login
4. `app/services/telegram/auth.py` — tạo file `.session`
5. `app/routers/sessions.py` — liệt kê session
6. `app/utils/responses.py` — format response chuẩn

**Bài tập (tự làm):**

- [ ] Tạo `.env` (API ID/HASH từ https://my.telegram.org)
- [ ] `POST /api/auth/send-code` → nhận OTP trên Telegram app
- [ ] `POST /api/auth/login` → `GET /api/sessions` thấy count = 1
- [ ] Vẽ sơ đồ: send-code → login → sessions

**Câu phỏng vấn luyện tập:**

- FastAPI khác Flask/Django thế nào?
- `async def` endpoint nghĩa là gì?
- Vì sao tách `routers` và `services`?
- Response `{ success, data, error }` giúp gì cho client?

**Chưa cần học:** `app/db/models/`, `alembic/`, Celery, Redis.

---

### Level 2 — Viết API đơn giản (tuần 2–3)

**Mục tiêu:** Tự thêm 1 endpoint mà không sợ phá project.

**Học thêm:**

- Pydantic `BaseModel`, `Field`, validation
- `APIRouter`, `Depends`, HTTP exception
- Đọc `routers/sessions.py`, `routers/health.py`

**Project task (chọn 1):**

- [ ] `GET /api/ping` → `{ "message": "pong" }` bọc envelope
- [ ] `GET /api/sessions/{phone}` → kiểm tra 1 session có tồn tại không
- [ ] `GET /api/config/public` → trả `app_name`, `session_dir` (không lộ secret)

**Kỹ năng đạt được:** Tự tin sửa FastAPI; hiểu request/response lifecycle.

---

### Level 3 — Database & CRUD (tuần 4–5) → Phase 1

**Mục tiêu:** Dữ liệu lưu DB, không chỉ đọc file trên disk.

**Học thêm:**

- SQLAlchemy 2.0 async (`select`, `session.execute`)
- Alembic migration (`alembic upgrade head`)
- Model `TelegramAccount` — đọc 1 model trước, đủ dùng

**Project task (theo Phase 1):**

- [ ] `POST /api/sessions/check` — kiểm tra session, ghi `TelegramAccount`
- [ ] `DELETE /api/sessions/{phone}` — xóa session file
- [ ] `GET /api/accounts` — list account từ DB

**Kỹ năng đạt được:** CRUD cơ bản — đủ nhiều JD fresher Backend.

---

### Level 4 — Tích hợp & logic phức tạp (tuần 6–8) → Phase 2–3

**Mục tiêu:** Gọi API bên ngoài, xử lý lỗi, concurrency an toàn.

**Học thêm:**

- Telethon async pattern
- `SessionFileLock` — race condition / multi-process
- Rate limit, proxy (đọc khi cần)

**Project task:**

- [ ] `POST /api/groups/leave`
- [ ] `GET /api/groups/{phone}` — danh sách nhóm đã join
- [ ] (Tùy chọn) `POST /api/auth/send-code` — OTP Telegram

**Kỹ năng đạt được:** Integration API thực tế — điểm cộng lớn khi phỏng vấn.

---

### Level 5 — Background job (tuần 9–11) → Phase 4

**Mục tiêu:** Bulk action không block HTTP request.

**Học thêm:**

- Redis, Celery worker
- Task polling: `POST /action` → `GET /tasks/{id}/status`
- Model `TaskRun`, `TaskRunLog`

**Project task:**

- [ ] Bulk join 10 account → chạy background, xem log realtime
- [ ] Pause / stop / retry task

**Kỹ năng đạt được:** Hiểu job queue — vượt mức fresher trung bình.

---

### Level 6 — Đóng gói portfolio (tuần 12–13) → Phase 7

**Mục tiêu:** Repo public, recruiter mở vào là hiểu.

**Checklist portfolio:**

- [ ] README: mô tả, screenshot `/docs`, hướng dẫn chạy
- [ ] `pytest` ít nhất 5 test (health, sessions, join mock)
- [ ] `docker-compose.yml` (api + redis)
- [ ] GitHub public, commit message rõ ràng
- [ ] Không lộ `.env`, `*.session`

**Mẫu mô tả CV (tiếng Anh ngắn):**

> Built a FastAPI backend integrating Telethon for Telegram automation. Implemented layered architecture (routers/services), async SQLAlchemy, file-based session locking, and Celery background tasks for bulk operations.

---

### Ma trận ưu tiên học (Intern/Fresher)

```
Bắt buộc   │ Level 1 → 2 → 3
Quan trọng │ Level 4 (1 endpoint Telethon thêm)
Nổi bật    │ Level 5 (Celery) hoặc Level 6 (test + Docker)
Để sau     │ Phase 5–6 đầy đủ, mapping Django chi tiết
```

**Mức tối thiểu để apply intern:** Level 1–3 + README sạch (≈ 4–5 tuần part-time).

**Mức nổi bật:** thêm Level 4–5 hoặc Docker + test (≈ 8–10 tuần part-time).

---

### Việc làm tuần này (theo lộ trình học)

1. ~~Phase 0 / Level 1 nền~~ (xong)
2. Tạo `.env`, chạy server, hoàn thành checklist Level 1
3. Level 2: tự viết 1 endpoint mới (`/api/ping` hoặc tương đương)
4. Đọc `TelegramAccount` model — chuẩn bị Level 3
5. Public repo GitHub khi xong Level 2–3

---

## 3. Kiến trúc đề xuất

```
telegram_manager_api/
├── app/
│   ├── main.py                 # FastAPI app, mount routers
│   ├── config.py               # Settings từ .env
│   ├── schemas/                # Pydantic request/response
│   ├── db/                     # ← Level 3: SQLAlchemy + models
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
├── alembic/                    # ← Level 3: DB migrations
├── runtime/                    # locks, logs
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

## 4. Inventory Django (tham chiếu)

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

## 5. Roadmap kỹ thuật theo phase

> Ánh xạ Level học ↔ Phase code: L1=Phase0, L2=+, L3=Phase1, L4=Phase2–3, L5=Phase4, L6=Phase7.
>
> Học theo **mục 2** trước; quay lại đây khi implement từng phase.

### Phase 0 — Nền tảng (Level 1) ✅

Mục tiêu: Bắt đầu **không có file `.session`** — chỉ mới đăng nhập Telegram app. (Level 1)

> **Lưu ý:** Đăng nhập Telegram trên điện thoại ≠ có session cho API.  
> Phải gọi `send-code` + `login` qua API để Telethon tạo file `.session` trên disk.

- [x] Cấu trúc `routers/`, `services/`, `utils/`, `schemas/`
- [x] `config.py`: Telegram API + `SESSION_FOLDER` + session lock
- [x] Response envelope + exception handler
- [x] `POST /api/auth/send-code` — gửi OTP
- [x] `POST /api/auth/login` — tạo file `.session` (hỗ trợ 2FA)
- [x] `GET /api/sessions` — kiểm tra đã có session chưa
- [ ] `groups/join`, session lock → **Phase 2+**
- [ ] DB / Alembic / Redis → **Level 3**

**Luồng dùng từ đầu (không có session):**

```
1. .env          TELEGRAM_API_ID + HASH (https://my.telegram.org)
2. send-code     OTP gửi về Telegram app
3. login         Nhập OTP → tạo file .session
4. sessions      Xác nhận count >= 1
```

**Deliverable:** Repo chạy được, OpenAPI docs, **3 endpoint** — tự tạo session qua API.

**API Phase 0 (chỉ 3 endpoint):**

| Endpoint | Mô tả |
|---|---|
| `POST /api/auth/send-code` | Gửi OTP |
| `POST /api/auth/login` | Tạo session |
| `GET /api/sessions` | Liệt kê session |

**Cấu trúc Phase 0 (đọc theo thứ tự):**

```
app/
├── main.py
├── config.py
├── routers/          auth, sessions
├── services/telegram/  auth.py
├── schemas/
└── utils/            responses, exceptions
```

---

### Phase 1 — Session & Account (2 tuần) ← **tiếp theo (Level 3)**

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

## 6. Ma trận ưu tiên (phát triển sản phẩm)

```
Cao  │ Phase 0 → 1 → 3 → 4 (join bulk)
     │         ↘ 2 (auth) nếu cần tạo session mới qua API
Thấp │ Phase 5 → 6 → 7
```

**Lý do:** Join group bulk + task system là lõi Django; làm xong Phase 0–4 là đã dùng được ~70% giá trị.

> **Học intern/fresher:** ưu tiên theo **mục 2** (Level 1–3 trước), không cần theo ma trận này ngay.

---

## 7. Chiến lược port code từ Django

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

## 8. Quan hệ với Django sau này

| Hướng | Mô tả |
|---|---|
| **A. Song song** | Django = UI, FastAPI = API cho script/tool khác |
| **B. Django gọi FastAPI** | Django UI giữ nguyên, backend dần chuyển sang FastAPI |
| **C. Thay thế** | FastAPI đủ feature → bỏ Django, thêm SPA sau |

**Khuyến nghị hiện tại:** Hướng A — ít rủi ro, Django vẫn chạy ổn.

---

## 9. GitHub

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

## 10. Timeline

### Học Intern/Fresher (part-time ~10h/tuần)

| Level | Nội dung | Tuần | Cumulative |
|---|---|---|---|
| 1 | Đọc hiểu Phase 0 | 1 | 1 tuần |
| 2 | Tự viết endpoint | 1–2 | 3 tuần |
| 3 | DB + Phase 1 | 2 | 5 tuần |
| 4 | Phase 2–3 | 2–3 | 8 tuần |
| 5 | Celery Phase 4 | 2–3 | 11 tuần |
| 6 | Test + Docker | 1–2 | **~3 tháng** |

**Apply intern sớm:** sau Level 3 (~5 tuần). Tiếp tục Level 4–6 khi chờ phản hồi.

### Phát triển sản phẩm đầy đủ (tham chiếu)

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

---

## 11. Mapping endpoint Django → FastAPI (tham chiếu — đọc khi cần)

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

*Cập nhật lần cuối: 2026-06-29 — thêm lộ trình học Intern/Fresher (mục 2)*