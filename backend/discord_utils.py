import os
import requests
from models import Clip, User

FRONTEND_URL = os.getenv("FRONTEND_URL")
DISCORD_WEBHOOK = os.getenv("DISCORD_WEBHOOK_URL")
BACKEND_URL = os.getenv("BACKEND_URL")

def send_discord_notification(clip: Clip, user: User):
    embed = {
        "title": f"New Clip: {clip.title}",
        "description": clip.description or "No description",
        "url": f"{FRONTEND_URL}/clip/{clip.id}",
        "color": 5814783,
        "author": {
            "name": user.username,
        },
        "fields": [
            {
                "name": "Duration",
                "value": f"{clip.duration}s",
                "inline": True
            }
        ],
        "thumbnail": {
            "url": f"{BACKEND_URL}/api/clips/{clip.id}/thumbnail"
        },
        "timestamp": clip.uploaded_at.isoformat()
    }
    
    try:
        response = requests.post(DISCORD_WEBHOOK, json={"embeds": [embed]})
        response.raise_for_status()
    except Exception as e:
        print(f"Discord notification failed: {e}")
        