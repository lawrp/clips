from fastapi import UploadFile, HTTPException
from PIL import Image
import os
from pathlib import Path
import uuid

UPLOAD_DIR = Path("uploads/profile_pictures")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 5 * 1024 * 1024
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

def validate_image(file: UploadFile):
    """Validate uploaded image file"""
    
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    return file_ext

def resize_image(image_path: str, max_size: tuple = (400, 400)) -> None:
    img = Image.open(image_path)
    
    if img.mode == 'RGBA':
        img = img.convert('RGB')
    
    img.thumbnail(max_size, Image.Resampling.LANCZOS)
    
    img.save(image_path, optimize=True, quality=85)
    
async def save_profile_picture(file: UploadFile, user_id: int) -> tuple[str, str]:
    file_ext = validate_image(file)
    
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max size: 5MB")
    
    filename = f"{user_id}_{uuid.uuid4().hex}{file_ext}"
    file_path = UPLOAD_DIR / filename
    
    with open(file_path, "wb") as f:
        f.write(contents)
    
    try:
        resize_image(str(file_path))
    except Exception as e:
        if file_path.exists():
            os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")
    
    file_url = f"/uploads/profile_pictures/{filename}"
    return filename, file_url

def delete_profile_picture_file(filename: str) -> None:
    file_path = UPLOAD_DIR / filename
    
    if file_path.exists():
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Error deleting file {filename}: {e}")

