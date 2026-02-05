from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional
from dotenv import load_dotenv
import shutil
import os
from uuid import uuid4
import ffmpeg

from database import get_db, Base, engine
from models import User, Clip, Comment, CommentDislike, CommentLike, ClipLike
from schemas import UserCreate, UserResponse, Token, ClipResponse, CommentResponse, CommentCreate, CommentUpdate, ClipUpdate, PasswordRequest, PasswordResetRequest, EmailRequest, ProfilePictureResponse, UserRole, UserApprovalUpdate, UserRoleUpdate, AdminStats
from auth import hash_password, verify_password, create_access_token, get_current_user, get_current_user_optional
from email_service import send_username_recovery_email, send_password_recovery_email, generate_reset_token
from image_utils import save_profile_picture, delete_profile_picture_file
from init_admin import create_admin_user
from contextlib import asynccontextmanager
from auth_utils import require_admin, require_approved, require_role, require_moderator_or_admin
from thumbnail_service import process_and_store_thumbnail, cleanup_thumbnails

Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(" Starting Clips API...")
    create_admin_user()
    mount_static_files(app)
    yield
    print("👋 Shutting down ClipHub API...")


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200",
                   "https://clipapi.joycliff.net",
                   "https://192.168.11.175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

load_dotenv()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
MAX_FILE_SIZE = 1024 * 1024 * 1024
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:4200")
    
def mount_static_files(app: FastAPI):
    static_mounts = {
        "profile_pictures": "uploads/profile_pictures",
        "thumbnails": "uploads/thumbnails",
    }
    for name, directory in static_mounts.items():
        os.makedirs(directory, exist_ok=True)
        app.mount(f"/uploads/{name}",
                  StaticFiles(directory=directory, check_dir=True),
                  name=name)
        print(f"✅ Static mount verified: /{name} -> {directory}")

@app.post("/api/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found with that username.")
    
    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password for that username!"
        )
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/users/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user
    
@app.get("/api/users/{username}", response_model=UserResponse)
def get_user_by_username(username: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.post("/api/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    
    existing_user = db.query(User).filter(User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    existing_email = db.query(User).filter(User.email == user.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    
    
    hashed_pw = hash_password(user.password)
    new_user = User(username=user.username, email=user.email, password_hash=hashed_pw, role=UserRole.USER, approved=True)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    print(new_user.username)
    print(new_user.password_hash)
    return new_user

@app.post("/api/clips/upload", response_model=ClipResponse)
async def upload_clip(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    description: str = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(require_approved),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith('.mp4'):
        raise HTTPException(status_code=400, detail="Only MP4 files allowed")
    
    file_size = 0
    chunk_size = 1024 * 1024
    temp_path = f"{UPLOAD_DIR}/temp_{uuid4()}"
    
    with open(temp_path, "wb") as buffer:
        while chunk := await file.read(chunk_size):
            file_size += len(chunk)
            if file_size > MAX_FILE_SIZE:
                os.remove(temp_path)
                raise HTTPException(status_code=400, detail="File too large (max 1GB)")
            buffer.write(chunk)
            
    unique_filename = f"{uuid4()}_{file.filename}"
    file_path = f"{UPLOAD_DIR}/{unique_filename}"
    os.rename(temp_path, file_path)
    
    try:
        probe = ffmpeg.probe(file_path)
        duration = float(probe['format']['duration'])
        duration_seconds = int(duration)
    except Exception as e:
        print(f"Could not get the video duration due to an error: {e}")
        duration_seconds = None
        
    new_clip = Clip(
        user_id=current_user.id,
        filename=file.filename,
        file_path=file_path,
        file_size=file_size,
        duration=duration_seconds,
        title=title,
        description=description
    )
    try:
        db.add(new_clip)
        db.commit()
        db.refresh(new_clip)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=500, detail="Failed to save clip")
        
    
    background_tasks.add_task(process_and_store_thumbnail, new_clip.id, file_path)
    
    response = ClipResponse(
        id=new_clip.id,
        user_id=new_clip.user_id,
        filename=new_clip.filename,
        file_path=new_clip.file_path,
        thumbnail_path=None,
        title=new_clip.title,
        description=new_clip.description,
        uploaded_at=new_clip.uploaded_at,
        file_size=new_clip.file_size,
        duration=new_clip.duration,
        username=current_user.username,
        likes=new_clip.likes,
        user_has_liked=False,
        private=new_clip.private
    )
    return response

@app.get("/api/clips/{clip_id}", response_model=ClipResponse)
def get_clip_by_id(clip_id: int,  current_user: Optional[User] = Depends(get_current_user_optional), db: Session = Depends(get_db)):
    clip = db.query(Clip).filter(Clip.id == clip_id).first()

    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    
    if clip.private:
        if not current_user:
            raise HTTPException(status_code=403, detail="This clip is private")
        if current_user.id != clip.user_id and current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This clip is private")
    
    if not os.path.exists(clip.file_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    user_has_liked = False
    if current_user:
        user_has_liked = db.query(ClipLike).filter(
            ClipLike.clip_id == clip_id,
            ClipLike.user_id == current_user.id
        ).first() is not None
        
    
    return ClipResponse(
        id=clip.id,
        user_id=clip.user_id,
        filename=clip.filename,
        file_path=clip.file_path,
        title=clip.title,
        description=clip.description,
        uploaded_at=clip.uploaded_at,
        file_size=clip.file_size,
        duration=clip.duration,
        username=clip.user.username,
        likes=clip.likes,
        user_has_liked=user_has_liked,
        private=clip.private
    )

@app.get("/api/clips", response_model=List[ClipResponse])
def get_clips(user_id: int = None, search: str = None, min_duration: int = None, max_duration: int = None, 
               current_user: Optional[User] = Depends(get_current_user_optional), skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    query = db.query(Clip).join(User)
    
    if user_id:
        query = query.filter(Clip.user_id == user_id)
        
        if not current_user or (current_user.id != user_id and current_user.role != UserRole.ADMIN):
            query = query.filter(Clip.private == False)
        
    if search:
        query = query.filter(Clip.title.ilike(f"%{search}%"))
        
    if min_duration:
        query = query.filter(Clip.duration >= min_duration)
    
    if max_duration:
        query = query.filter(Clip.duration <= max_duration)
    
    
    clips = query.order_by(Clip.uploaded_at.desc()).offset(skip).limit(limit).all()
    
    return [
        ClipResponse(
            id=clip.id,
            user_id=clip.user_id,
            filename=clip.filename,
            file_path=clip.file_path,
            thumbnail_path=clip.thumbnail_path,
            title=clip.title,
            description=clip.description,
            uploaded_at=clip.uploaded_at,
            file_size=clip.file_size,
            duration=clip.duration,
            username=clip.user.username,
            likes=clip.likes,
            user_has_liked=(
                db.query(ClipLike).filter(
                    ClipLike.clip_id == clip.id,
                    ClipLike.user_id == current_user.id
                ).first() is not None
                if current_user else False
            ),
            private=clip.private
        )
        for clip in clips
        if os.path.exists(clip.file_path)
    ]

@app.get("/api/clips/{clip_id}/video")
def stream_video(clip_id: int, current_user: Optional[User] = Depends(get_current_user_optional), db: Session = Depends(get_db)):
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    
    if clip.private:
        if not current_user:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This clip is private")
        if current_user.id != clip.user_id and current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This clip is private")
            
    
    if not os.path.exists(clip.file_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    return FileResponse(
        clip.file_path, 
        media_type="video/mp4", 
        headers={
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        }
    )


@app.get("/api/clips/{clip_id}/comments", response_model=List[CommentResponse])
def get_comments(
    clip_id: int, 
    include_deleted: bool = False, 
    current_user: Optional[User] = Depends(get_current_user_optional), 
    db: Session = Depends(get_db)
    ):
    
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    
    query = db.query(Comment).filter(Comment.video_id == clip.id)
    
    if not include_deleted:
        query = query.filter(Comment.is_deleted == False)
    
    comments = query.order_by(Comment.created_at.desc()).all()
    
    return [
        CommentResponse(
            id=comment.id,
            video_id=comment.video_id,
            commenter_id=comment.commenter_id,
            commenter_username=comment.user.username,
            message=comment.message,
            created_at=comment.created_at,
            edited_at=comment.edited_at,
            parent_comment_id=comment.parent_comment_id,
            likes=comment.likes,
            dislikes=comment.dislikes,
            reply_count=len([r for r in comment.replies if not r.is_deleted]) if comment.replies else 0,
            is_deleted=comment.is_deleted,
            
            user_has_liked=(
                db.query(CommentLike).filter(
                    CommentLike.user_id == current_user.id,
                    CommentLike.comment_id == comment.id
                ).first() is not None
                if current_user else False
            ),
            user_has_disliked=(
                db.query(CommentDislike).filter(
                    CommentDislike.user_id == current_user.id,
                    CommentDislike.comment_id == comment.id
                ).first() is not None
                if current_user else False
            ),
        )
        for comment in comments
    ]

@app.post("/api/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_comment(comment: CommentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    clip = db.query(Clip).filter(Clip.id == comment.video_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    
    if comment.parent_comment_id:
        parent = db.query(Comment).filter(Comment.id == comment.parent_comment_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")
        
        if parent.video_id != comment.video_id:
            raise HTTPException(status_code=400, detail="Parent comment is not on this clip")
        
    new_comment = Comment(
        video_id=comment.video_id,
        commenter_id=current_user.id,
        message=comment.message,
        parent_comment_id=comment.parent_comment_id,
        likes=0,
        dislikes=0,
        is_deleted=False
    )
    
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    
    return CommentResponse(
        id=new_comment.id,
        video_id=new_comment.video_id,
        commenter_id=new_comment.commenter_id,
        commenter_username=current_user.username,
        message=new_comment.message,
        created_at=new_comment.created_at,
        edited_at=new_comment.edited_at,
        parent_comment_id=new_comment.parent_comment_id,
        likes=new_comment.likes,
        dislikes=new_comment.dislikes,
        reply_count=0,  
        is_deleted=new_comment.is_deleted,
        user_has_liked=False,
        user_has_disliked=False
    )
    
@app.put("/api/comments/{comment_id}", response_model=CommentResponse)
def update_comment(
    comment_id: int,
    comment_update: CommentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find the comment
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Verify ownership
    if comment.commenter_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own comments"
        )
    
    # Don't allow editing deleted comments
    if comment.is_deleted:
        raise HTTPException(status_code=400, detail="Cannot edit deleted comment")
    
    # Update the comment
    comment.message = comment_update.message
    comment.edited_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(comment)
    
    return CommentResponse(
        id=comment.id,
        video_id=comment.video_id,
        commenter_id=comment.commenter_id,
        commenter_username=comment.user.username,
        message=comment.message,
        created_at=comment.created_at,
        edited_at=comment.edited_at,
        parent_comment_id=comment.parent_comment_id,
        likes=comment.likes,
        dislikes=comment.dislikes,
        reply_count=len(comment.replies) if comment.replies else 0,
        is_deleted=comment.is_deleted
    )
    
@app.delete("/api/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Verify ownership
    if comment.commenter_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own comments"
        )
    
    # Soft delete - keep the comment but mark as deleted
    comment.is_deleted = True
    comment.message = "[deleted]"
    
    db.commit()
    return None

@app.post("/api/comments/{comment_id}/like")
def like_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    existing_like = db.query(CommentLike).filter(
        CommentLike.user_id == current_user.id,
        CommentLike.comment_id == comment_id
    ).first()
    
    if existing_like:
        
        db.delete(existing_like)
        comment.likes -= 1
        
    else:
        existing_dislike = db.query(CommentDislike).filter(
            CommentDislike.user_id == current_user.id,
            CommentDislike.comment_id == comment_id
        ).first()
        if existing_dislike:
            db.delete(existing_dislike)
            comment.dislikes -= 1
        
        new_like = CommentLike(user_id=current_user.id, comment_id=comment_id)
        db.add(new_like)
        comment.likes += 1
    
    db.commit()
    db.refresh(comment)
    
    return {
        "likes": comment.likes,
        "dislikes": comment.dislikes,
        "user_has_liked": existing_like is None,
        "user_has_disliked": False
    }

@app.post("/api/comments/{comment_id}/dislike")
def dislike_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    existing_dislike = db.query(CommentDislike).filter(
        CommentDislike.user_id == current_user.id,
        CommentDislike.comment_id == comment_id
    ).first()
    
    if existing_dislike:
        db.delete(existing_dislike)
        comment.dislikes -= 1
    else:
        existing_like = db.query(CommentLike).filter(
            CommentLike.user_id == current_user.id,
            CommentLike.comment_id == comment_id
        ).first()
        if existing_like:
            db.delete(existing_like)
            comment.likes -= 1
        
        new_dislike = CommentDislike(user_id=current_user.id, comment_id=comment_id)
        db.add(new_dislike)
        comment.dislikes += 1
        
    db.commit()
    db.refresh(comment)
    
    return {
        "likes": comment.likes,
        "dislikes": comment.dislikes,
        "user_has_liked": False,
        "user_has_disliked": existing_dislike is None
    }

@app.post("/api/clips/{clip_id}/like")
def like_clip(
    clip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    
    existing_like = db.query(ClipLike).filter(
        ClipLike.user_id == current_user.id,
        ClipLike.clip_id == clip_id
    ).first()
    
    if existing_like:
        db.delete(existing_like)
        clip.likes -= 1
        user_has_liked = False

    else:
        new_like = ClipLike(user_id=current_user.id, clip_id=clip_id)
        db.add(new_like)
        clip.likes += 1
        user_has_liked = True
        
    db.commit()
    db.refresh(clip)
    
    return {
        "likes": clip.likes,
        "user_has_liked": user_has_liked,
    }

@app.patch("/api/clips/{clip_id}", response_model=ClipResponse)
def update_clip_data(clip_id: int, clip_update: ClipUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    
    if not clip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clip not found")
    
    if clip.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not the owner of this clip")
    
    if clip_update.title is not None:
        if not clip_update.title.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Title cannot be empty")
        clip.title = clip_update.title
        
    if clip_update.description is not None:
        clip.description = clip_update.description
        
    if clip_update.private is not None:
        clip.private = clip_update.private
    
    db.commit()
    db.refresh(clip)
    
    user_has_liked = db.query(ClipLike).filter(
        ClipLike.clip_id == clip_id,
        ClipLike.user_id == current_user.id
    ).first() is not None
    
    return ClipResponse(
        id=clip.id,
        user_id=clip.user_id,
        filename=clip.filename,
        file_path=clip.file_path,
        thumbnail_path=clip.thumbnail_path,
        title=clip.title,
        description=clip.description,
        uploaded_at=clip.uploaded_at,
        file_size=clip.file_size,
        duration=clip.duration,
        username=clip.user.username,
        likes=clip.likes,
        user_has_liked=user_has_liked,
        private=clip.private
    )
        
@app.delete("/api/clips/{clip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_clip(clip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)):
    
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    
    if not clip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clip was not found!")
    
    if clip.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User does not have permission to delete this clip.")
    
    if os.path.exists(clip.file_path):
        try:
            os.remove(clip.file_path)
            print(f"Successfully deleted file at: {clip.file_path}")
        except Exception as e:
            print(f"Error deleting file: {e}")
    
    cleanup_thumbnails(clip.id)
    
    db.delete(clip)
    db.commit()
    
    return None

@app.post("/api/recover-username")
def recover_username(request: EmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user:
        return {"message", "If that email exists, we've sent a recovery email"}
    
    success = send_username_recovery_email(user.email, user.username)
    
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to send email")
    
    return {"message": "If that email exists, we've send a recovery email"}
    
@app.post("/api/request-password-reset")
def request_password_reset(request: PasswordRequest, db: Session = Depends(get_db)):
    print(f"Received request - username: '{request.username}', email: '{request.email}'")
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user:
        return {"message": "If that email exists, we've sent a reset link"}
    
    if user.username != request.username:
        return {"message": "If that email exists, we've sent a reset link"}
    
    token = generate_reset_token()
    user.reset_token = token
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    db.commit()
    
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
    success = send_password_recovery_email(user.email, reset_link)
    
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to send email")
    
    return {"message": "If that email exists, we've sent a reset link"}


@app.post("/api/reset-password")
def reset_password(request: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.reset_token == request.token,
        User.reset_token_expires > datetime.now(timezone.utc)
    ).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    # Update password
    user.password_hash = hash_password(request.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    
    return {"message": "Password reset successful"}

@app.post("/api/profile/upload-picture", response_model=ProfilePictureResponse)
async def upload_profile_picture(file: UploadFile = File(...), 
                                 current_user: User = Depends(get_current_user),
                                 db: Session = Depends(get_db)):
    filename, file_url = await save_profile_picture(file, current_user.id)
    
    user = db.query(User).filter(User.id == current_user.id).first()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    old_filename = user.profile_picture
    
    user.profile_picture = filename
    user.profile_picture_url = file_url
    db.commit()
    db.refresh(user)
    
    if old_filename:
        delete_profile_picture_file(old_filename)
    
    return ProfilePictureResponse(
        profile_picture_url=user.profile_picture_url,
        message="Profile picture uploaded successfully"
    )
    
@app.get("/api/profile/picture")
def get_profile_picture(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return {
        "profile_picture_url": user.profile_picture_url
    }

@app.delete("/api/profile/delete-picture")
def delete_profile_picture(current_user: User = Depends(get_current_user),
                           db: Session = Depends(get_db)):
    
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not user.profile_picture:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No profile picture to delete")

    old_filename = user.profile_picture
    
    user.profile_picture = None
    user.profile_picture_url = None
    db.commit()
    
    return {"message": "Profile picture deleted successfully"}

@app.get("/api/users/{user_id}/profile-picture")
def get_user_profile_picture_public(
    user_id: int,
    db: Session = Depends(get_db)
):
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
   
    return {
        "user_id": user_id,
        "profile_picture_url": user.profile_picture_url
    }

@app.get("/debug/check-static")
def check_static():
    from pathlib import Path
    profile_dir = Path("uploads/profile_pictures")
    
    files = list(profile_dir.glob("*")) if profile_dir.exists() else []
    
    return {
        "directory_exists": profile_dir.exists(),
        "absolute_path": str(profile_dir.absolute()),
        "files_count": len(files),
        "files": [f.name for f in files],
        "mount_path": "/uploads/profile_pictures",
        "sample_url": f"http://localhost:8000/uploads/profile_pictures/{files[0].name}" if files else None
    }


@app.patch("/api/admin/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    role_update: UserRoleUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.id == current_user.id and role_update.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own admin role"
        )
    if user_id == 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="cannot demote the admin account.")
    
    user.role = role_update.role
    db.commit()
    db.refresh(user)
    
    return user

@app.patch("/api/admin/users/{user_id}/approval", response_model=UserResponse)
def update_user_approval(
    user_id: int,
    approval: UserApprovalUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    print('Printing my args....')
    print('Approval', approval)
    print('UserId', user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student was not found")

    if current_user.id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change your own approval")

    if user_id == 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="cannot unapprove the admin account.")

    user.approved = approval.approved
    db.commit()
    db.refresh(user)
    
    return user

@app.get("/api/admin/users", response_model=List[UserResponse])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    role_filter: Optional[str] = None,
    approval_filter: Optional[bool] = None,
    search: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    
    if role_filter:
        query = query.filter(User.role == role_filter)
    
    if approval_filter:
        query = query.filter(User.approved == approval_filter)
    
    if search:
        query = query.filter(
            (User.username.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )
    
    users = query.offset(skip).limit(limit).all()
    
    return users


@app.delete("/api/admin/users/{user_id}")
def delete_user(user_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="User was not found"
        )
        
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account"
        )
    
    clips = db.query(Clip).filter(Clip.user_id == user_id).all()
    
    for clip in clips:
        if os.path.exists(clip.file_path):
            print(f"removing {user.username} | {clip.file_path}")
            os.remove(clip.file_path)
        cleanup_thumbnails(clip.id)
    
    if user.profile_picture:
        delete_profile_picture_file(user.profile_picture)
    
    db.delete(user)
    db.commit()
    
    return

@app.get("/api/admin/stats", response_model=AdminStats)
def get_admin_stats(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
     
    total_users = db.query(User).count()
    pending_users = db.query(User).filter(User.approved == False).count()
    total_videos = db.query(Clip).count()
    total_comments = db.query(Comment).count()
    
    return {
        "total_users": total_users,
        "pending_approvals": pending_users,
        "approved_users": total_users - pending_users,
        "total_videos": total_videos,
        "total_comments": total_comments,
        "admins": db.query(User).filter(User.role == UserRole.ADMIN).count(),
        "moderators": db.query(User).filter(User.role == UserRole.MODEDRATOR).count()
    }

@app.get("/api/feed", response_model=List[ClipResponse])
def get_feed(
    cursor: Optional[int] = None,
    limit: int = 5,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(Clip).join(User).filter(Clip.private == False)
    
    if cursor:
        query = query.filter(Clip.id < cursor)
    
    clips = query.order_by(Clip.id.desc()).limit(limit).all()
    
    return [
        ClipResponse(
            id=clip.id,
            user_id=clip.user_id,
            filename=clip.filename,
            file_path=clip.file_path,
            thumbnail_path=clip.thumbnail_path,
            title=clip.title,
            description=clip.description,
            uploaded_at=clip.uploaded_at,
            file_size=clip.file_size,
            duration=clip.duration,
            username=clip.user.username,
            likes=clip.likes,
            user_has_liked=(
                db.query(ClipLike).filter(
                    ClipLike.clip_id == clip.id,
                    ClipLike.user_id == current_user.id
                ).first() is not None
                if current_user else False
            ),
            private=clip.private
        )
        for clip in clips
        if os.path.exists(clip.file_path)
    ]