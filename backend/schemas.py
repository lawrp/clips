from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    username: str
    password: str
    
class UserResponse(BaseModel):
    id: int
    username: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class ClipResponse(BaseModel):
    id: int
    user_id: int
    filename: str
    file_path: str
    uploaded_at: datetime
    file_size: int
    duration: Optional[int] = None
    username: str
    title: str
    description: Optional[str] = None
    
    class Config:
        from_attributes = True

class ClipUpload(BaseModel):
    title: str
    description: Optional[str] = None
