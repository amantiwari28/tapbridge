from pydantic import BaseModel

class SessionCreate(BaseModel):
    amount: int
    currency: str = "INR"

class SessionResponse(BaseModel):
    session_id: str
    amount: int
    currency: str
    status: str