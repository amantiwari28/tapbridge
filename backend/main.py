# -------------------- IMPORTS --------------------
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import uuid
import io
import qrcode

from database import SessionLocal, engine, Base
import models
import schemas
from utils import detect_device, decide_route

# -------------------- LOAD ENV --------------------
load_dotenv()

# -------------------- APP INIT --------------------
app = FastAPI(title="TapBridge API", version="1.0.0")

# -------------------- CORS --------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------- CREATE TABLES --------------------
Base.metadata.create_all(bind=engine)

# -------------------- DB DEPENDENCY --------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# -------------------- ROOT --------------------
@app.get("/")
def root():
    return {"message": "TapBridge API running"}

# -------------------- HEALTH --------------------
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "TapBridge backend is running!",
        "version": "1.0.0"
    }

# -------------------- CREATE SESSION --------------------
@app.post("/v1/sessions", response_model=schemas.SessionResponse)
def create_session(session: schemas.SessionCreate, db: Session = Depends(get_db)):
    session_id = str(uuid.uuid4())

    db_session = models.PaymentSession(
        session_id=session_id,
        amount=session.amount,
        currency=session.currency,
        status="pending"   # ✅ FIXED
    )

    db.add(db_session)
    db.commit()
    db.refresh(db_session)

    return db_session

# -------------------- DETECT + ROUTE --------------------
@app.post("/v1/sessions/{session_id}/detect")
def detect_and_route(session_id: str, request: Request):
    device = detect_device(request)
    route = decide_route(device)

    return {
        "session_id": session_id,
        "device": device,
        "route": route
    }

# -------------------- PAYMENT STATUS --------------------
@app.get("/v1/sessions/{session_id}/status")

def payment_status(session_id: str, db: Session = Depends(get_db)):
    
    db_session = db.query(models.PaymentSession).filter(
        models.PaymentSession.session_id == session_id
    ).first()

    if not db_session:
        return {"error": "Session not found"}

    # 🔥 ADD THIS LINE HERE
    print("🔥 STATUS API CALLED:", db_session.status)

    return {
        "session_id": session_id,
        "status": db_session.status
    }

# -------------------- QR GENERATE --------------------
@app.get("/v1/sessions/{session_id}/qr")
def generate_qr(session_id: str, db: Session = Depends(get_db)):

    db_session = db.query(models.PaymentSession).filter(
        models.PaymentSession.session_id == session_id
    ).first()

    if not db_session:
        return {"error": "Session not found"}

    # 🔥 DYNAMIC UPI LINK
    upi_link = f"upi://pay?pa=test@upi&pn=TapBridge&am={db_session.amount}&cu={db_session.currency}&tn={session_id}"

    qr = qrcode.make(upi_link)

    buffer = io.BytesIO()
    qr.save(buffer, format="PNG")
    buffer.seek(0)

    return StreamingResponse(buffer, media_type="image/png")

# -------------------- WEBHOOK --------------------
@app.post("/webhook/payment")
def payment_webhook(data: dict, db: Session = Depends(get_db)):
    session_id = data.get("session_id")

    db_session = db.query(models.PaymentSession).filter(
        models.PaymentSession.session_id == session_id
    ).first()

    if not db_session:
        return {"error": "Session not found"}

    # ✅ UPDATE DATABASE
    db_session.status = "success"
    db.commit()

    print("🔥 Payment updated in DB:", session_id)

    return {"message": "Webhook processed"}