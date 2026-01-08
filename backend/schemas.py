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
        json_encoders = {
            datetime: lambda dt: dt.isoformat() + 'Z' if dt.tzinfo is None else dt.isoformat()
        }

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
        json_encoders = {
            datetime: lambda dt: dt.isoformat() + 'Z' if dt.tzinfo is None else dt.isoformat()
        }

class ClipUpload(BaseModel):
    title: str
    description: Optional[str] = None
    
class CommentResponse(BaseModel):
    id: int
    video_id: int
    commenter_id: int
    commenter_username: str
    message: str
    created_at: datetime
    edited_at: datetime | None
    parent_comment_id: int | None
    likes: int
    dislikes: int
    reply_count: int
    is_deleted: bool
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat() + 'Z' if dt.tzinfo is None else dt.isoformat()
        }

class CommentCreate(BaseModel):
    video_id: int
    message: str
    parent_comment_id: int | None = None
    
class CommentUpdate(BaseModel):
    message: str