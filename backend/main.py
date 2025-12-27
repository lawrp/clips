from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import shutil
import os
from uuid import uuid4
import ffmpeg

from database import get_db
from models import User, Clip
from schemas import UserCreate, UserResponse, Token, ClipResponse
from auth import hash_password, verify_password, create_access_token, get_current_user

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
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


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
    
    db.add(new_clip)
    db.commit()
    db.refresh(new_clip)
    
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

@app.get("/api/clips", response_model=List[ClipResponse])
def get_clips(user_id: int = None, search: str = None, min_duration: int = None, max_duration: int = None, db: Session = Depends(get_db)):
    query = db.query(Clip).join(User)
    
    if user_id:
        query = query.filter(Clip.user_id == user_id)
        
    if search:
        query = query.filter(Clip.title.ilike(f"%{search}%"))
        
    if min_duration:
        query = query.filter(Clip.duration >= min_duration)
    
    if max_duration:
        query = query.filter(Clip.duration <= max_duration)
    
    
    clips = query.order_by(Clip.uploaded_at.asc()).all()
    
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
    ]

