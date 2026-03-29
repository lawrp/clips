import os
import requests
from models import Clip

FRONTEND_URL = os.getenv("FRONTEND_URL")
DISCORD_WEBHOOK = os.getenv("DISCORD_WEBHOOK_URL")
BACKEND_URL = os.getenv("BACKEND_URL")

def send_discord_notification(clip: Clip):
    clip_url = f"{BACKEND_URL}/clip/{clip.id}"

    try:
        response = requests.post(DISCORD_WEBHOOK, json={"content": clip_url})
        response.raise_for_status()
    except Exception as e:
        print(f"Discord notification failed: {e}")
        