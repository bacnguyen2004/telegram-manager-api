from app.schemas.auth import LoginData, SendCodeData


def test_login_data_accepts_need_signup():
    data = LoginData(
        status="need_signup",
        message="So chua co tai khoan",
        phone="+84901234567",
    )
    assert data.status == "need_signup"


def test_send_code_success_message():
    data = SendCodeData(
        status="success",
        message="Da gui ma OTP qua Telegram app. Nhap ma o buoc tiep theo.",
        phone="+84901234567",
    )
    assert "Nhap ma" in data.message