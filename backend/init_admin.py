from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import User
from auth import hash_password
from schemas import UserRole
import os
from dotenv import load_dotenv

load_dotenv()

def create_admin_user():
    db = SessionLocal()
    
    try:
        existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        
        if existing_admin:
            print(f"✓ Admin user already exists: {existing_admin.username}")
            return
        
        admin_username = os.getenv("ADMIN_USERNAME")
        admin_email = os.getenv("ADMIN_EMAIL")
        admin_password = os.getenv("ADMIN_PASSWORD")
        
        if not all ([admin_username, admin_email, admin_password]):
            print("⚠️  Warning: Admin credentials not found in environment variables")
            print("   Set ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD in .env file")
            return
        
        existing_user = db.query(User).filter(
            (User.username == admin_username) | (User.email == admin_email)
        ).first()
        
        if existing_user:
            existing_user.role = UserRole.ADMIN
            existing_user.approved = True
            db.commit()
            print(f"✓ Promoted existing user '{existing_user.username}' to admin")
        
        else:
            admin_user = User(
                username=admin_username,
                email=admin_email,
                password_hash=hash_password(admin_password),
                role=UserRole.ADMIN,
                approved=True
            )
            db.add(admin_user)
            db.commit()
            print(f"✓ Created new admin user: {admin_username}")
    except Exception as e:
        print(f"✗ Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()
    
if __name__ == "__main__":
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    # Create admin
    create_admin_user()