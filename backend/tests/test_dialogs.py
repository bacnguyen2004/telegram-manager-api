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