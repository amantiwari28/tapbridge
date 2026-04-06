from sqlalchemy import Column, Integer, String
from database import Base

class PaymentSession(Base):
    __tablename__ = "payment_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True)
    amount = Column(Integer)
    currency = Column(String, default="INR")
    status = Column(String, default="pending")