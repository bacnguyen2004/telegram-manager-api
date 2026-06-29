from app.services.telegram import dialogs


async def test_get_message_photo_success(client, monkeypatch):
    async def mock_get_message_photo(phone: str, peer_id: str, message_id: int):
        return b"\xff\xd8\xff fake-jpeg", "image/jpeg"

    monkeypatch.setattr(
        dialogs.telegram_dialog_service,
        "get_message_photo",
        mock_get_message_photo,
    )

    response = client.get(
        "/api/dialogs/%2B84901234567/messages/42/photo?peer_id=123456789",
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("image/jpeg")
    assert response.content == b"\xff\xd8\xff fake-jpeg"


async def test_get_message_photo_not_found(client, monkeypatch):
    async def mock_get_message_photo(phone: str, peer_id: str, message_id: int):
        return {"status": "error", "message": "Tin nhan khong co anh"}

    monkeypatch.setattr(
        dialogs.telegram_dialog_service,
        "get_message_photo",
        mock_get_message_photo,
    )

    response = client.get(
        "/api/dialogs/%2B84901234567/messages/42/photo?peer_id=123456789",
    )

    assert response.status_code == 404


async def test_mark_dialog_read_success(client, monkeypatch):
    async def mock_mark_dialog_read(phone: str, peer_id: str, max_id: int = 0):
        return {
            "status": "success",
            "phone": phone,
            "peer_id": peer_id,
            "read_inbox_max_id": max_id or 999,
            "unread_count": 0,
            "message": "OK",
        }

    monkeypatch.setattr(
        dialogs.telegram_dialog_service,
        "mark_dialog_read",
        mock_mark_dialog_read,
    )

    response = client.post(
        "/api/dialogs/%2B84901234567/read",
        json={"peer_id": "123456789", "max_id": 999},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["status"] == "success"
    assert body["data"]["read_inbox_max_id"] == 999
    assert body["data"]["unread_count"] == 0