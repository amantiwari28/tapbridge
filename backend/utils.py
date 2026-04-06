def detect_device(request):
    user_agent = request.headers.get("user-agent", "").lower()

    if "mobile" in user_agent:
        return "mobile"
    else:
        return "desktop"


def decide_route(device):
    if device == "mobile":
        return "NFC"
    else:
        return "QR"