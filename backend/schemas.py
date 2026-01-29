from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    MODEDRATOR = "moderator"
    USER = "user"
    GUEST = "guest"

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    
class UserResponse(BaseModel):
    id: int
    username: str
    created_at: datetime
    profile_picture_url: Optional[str] = None
    role: UserRole
    approved: bool

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
    likes: int
    user_has_liked: bool = False
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat() + 'Z' if dt.tzinfo is None else dt.isoformat()
        }


class ClipUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

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
    user_has_liked: bool = False
    user_has_disliked: bool = False
    
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

class PasswordRequest(BaseModel):
    username: str
    email: EmailStr
    
class PasswordResetRequest(BaseModel):
    token: str
    new_password: str

class EmailRequest(BaseModel):
    email: EmailStr

class ProfilePictureResponse(BaseModel):
    profile_picture_url: str
    message: str
    
class UserRoleUpdate(BaseModel):
    role: UserRole

class UserApprovalUpdate(BaseModel):
    approved: bool
