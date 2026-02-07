from PIL import Image
from pathlib import Path
import ffmpeg
import os
from discord_utils import send_discord_notification

THUMBNAIL_DIR = Path("uploads/thumbnails")
THUMBNAIL_DIR.mkdir(parents=True, exist_ok=True)

THUMBNAIL_SIZES = {
    "sm": (320, 180),
    "md": (640, 360),
    "lg": (1280, 720),
}

def extract_frame(video_path: str, output_path: str, timestamp: float = 1.0):
    
    try:
        (
            ffmpeg.input(video_path, ss=timestamp)
            .output(output_path, vframes=1, f="image2")
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
        return os.path.exists(output_path)
    except ffmpeg.Error as e:
        print(f"ffmpeg error extracting frame: {e.stderr.decode()}")
        return False
    
def resize_frame(input_path: str, output_path: str, size: tuple[int, int]) -> None:
    img = Image.open(input_path)
    
    if img.mode == "RGBA":
        img = img.convert("RGB")
    
    img.thumbnail(size, Image.Resampling.LANCZOS)
    img.save(output_path, format="JPEG", optimize=True, quality=85)
    

def generate_thumbnails(video_path: str, clip_id: int) -> str | None:
    
    base_name = f"{clip_id}"
    raw_frame_path = str(THUMBNAIL_DIR / f"{base_name}_raw.jpg")
    
    try:
        probe = ffmpeg.probe(video_path)
        duration = float(probe["format"]["duration"])
        timestamp = min(1.0, duration * 0.1)
    except Exception:
        timestamp = 0.0
    
    if not extract_frame(video_path, raw_frame_path, timestamp):
        print(f"Failed to extract frame from {video_path}")
        return None
    
    for label, size in THUMBNAIL_SIZES.items():
        variant_path = str(THUMBNAIL_DIR / f"{base_name}_thumb_{label}.jpg")
        try:
            resize_frame(raw_frame_path, variant_path, size)
        except Exception as e:
            print(f"Failed to generate {label} thumbnail: {e}")
            cleanup_thumbnails(clip_id)
            return None

    os.remove(raw_frame_path)
    return f"uploads/thumbnails/{base_name}_thumb_md.jpg"

def cleanup_thumbnails(clip_id: int) -> None:
    base_name = f"{clip_id}"
    
    for label in THUMBNAIL_SIZES:
        variant_path = THUMBNAIL_DIR / f"{base_name}_thumb_{label}.jpg"
        if variant_path.exists():
            os.remove(variant_path)
    
    raw_frame_path = THUMBNAIL_DIR / f"{base_name}_raw.jpg"
    if raw_frame_path.exists():
        os.remove(raw_frame_path)

def process_and_store_thumbnail(clip_id: int, video_path: str, notify_discord: bool) -> None:
    from database import get_db
    from models import Clip, User
    
    thumbnail_path = generate_thumbnails(video_path, clip_id)
    if not thumbnail_path:
        print(f"Thumbnail generation failed for clip {clip_id}")
        return
    
    db_session = next(get_db())
    try:
        clip = db_session.query(Clip).filter(Clip.id == clip_id).first()
        if clip:
            clip.thumbnail_path = thumbnail_path
            db_session.commit() 
        
        if notify_discord and clip:  
            user = db_session.query(User).filter(User.id == clip.user_id).first()
            if user:
                send_discord_notification(clip, user)
    finally:
        db_session.close()