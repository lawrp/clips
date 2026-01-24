from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil
import os
from uuid import uuid4
import ffmpeg

from database import get_db, Base, engine
from models import User, Clip, Comment, CommentDislike, CommentLike, ClipLike
from schemas import UserCreate, UserResponse, Token, ClipResponse, CommentResponse, CommentCreate, CommentUpdate
from auth import hash_password, verify_password, create_access_token, get_current_user, get_current_user_optional

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
MAX_FILE_SIZE = 1024 * 1024 * 1024


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
    
    hashed_pw = hash_password(user.password)
    new_user = User(username=user.username, password_hash=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    print(new_user.username)
    print(new_user.password_hash)
    return new_user

@app.post("/api/clips/upload", response_model=ClipResponse)
async def upload_clip(
    title: str = Form(...),
    description: str = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
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
        
    
    response = ClipResponse(
        id=new_clip.id,
        user_id=new_clip.user_id,
        filename=new_clip.filename,
        file_path=new_clip.file_path,
        title=new_clip.title,
        description=new_clip.description,
        uploaded_at=new_clip.uploaded_at,
        file_size=new_clip.file_size,
        duration=new_clip.duration,
        username=current_user.username
    )
    return response

@app.get("/api/clips/{clip_id}", response_model=ClipResponse)
def get_clip_by_id(clip_id: int,  current_user: Optional[User] = Depends(get_current_user_optional), db: Session = Depends(get_db)):
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    
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
        user_has_liked=user_has_liked
    )

@app.get("/api/clips", response_model=List[ClipResponse])
def get_clips(user_id: int = None, search: str = None, min_duration: int = None, max_duration: int = None, skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    query = db.query(Clip).join(User)
    
    if user_id:
        query = query.filter(Clip.user_id == user_id)
        
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
            title=clip.title,
            description=clip.description,
            uploaded_at=clip.uploaded_at,
            file_size=clip.file_size,
            duration=clip.duration,
            username=clip.user.username
        )
        for clip in clips
        if os.path.exists(clip.file_path)
    ]

@app.get("/api/clips/{clip_id}/video")
def stream_video(clip_id: int, db: Session = Depends(get_db)):
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    
    if not os.path.exists(clip.file_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    return FileResponse(clip.file_path, media_type="video/mp4")


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