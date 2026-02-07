import os
import requests
from models import Clip, User

FRONTEND_URL = os.getenv("FRONTEND_URL")
DISCORD_WEBHOOK = os.getenv("DISCORD_WEBHOOK_URL")
BACKEND_URL = os.getenv("BACKEND_URL")

def send_discord_notification(clip: Clip, user: User):
    
    author = { "name": user.username }
    if user.profile_picture_url:
        author["icon_url"] = f"{BACKEND_URL}{user.profile_picture_url}"
    
    embed = {
        "author": author,
        "title": f"{clip.title}",
        "description": clip.description or "No description",
        "url": f"{FRONTEND_URL}/clip/{clip.id}",
        "color": 5814783,
        "fields": [
            {
                "name": "Duration",
                "value": f"{clip.duration}s",
                "inline": True
            }
        ],
        "image": {
            "url": f"{BACKEND_URL}/{clip.thumbnail_path}"
        },
        "timestamp": clip.uploaded_at.isoformat(),
        "footer": {
            "text": "ClipHub"
        }
    }
    
    try:
        response = requests.post(DISCORD_WEBHOOK, json={"embeds": [embed]})
        response.raise_for_status()
    except Exception as e:
        print(f"Discord notification failed: {e}")
        