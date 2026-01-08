from sqlalchemy import Column, Integer, String, DateTime, BigInteger, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    clips = relationship("Clip", back_populates="user")
    comments = relationship("Comment", back_populates="user")
    
class Clip(Base):
    __tablename__ = "clips"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    file_size = Column(BigInteger, nullable=False)
    duration = Column(Integer)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    
    user = relationship("User", back_populates="clips")
    comments = relationship("Comment", back_populates="clip")
    
class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("clips.id"), nullable=False)
    commenter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    edited_at = Column(DateTime, nullable=True)
    parent_comment_id = Column(Integer, ForeignKey("comments.id"), nullable=True)
    likes = Column(Integer, default=0, nullable=False)
    dislikes = Column(Integer, default=0, nullable=False)
    is_deleted = Column(Boolean, default=False)  
    
    # Relationships
    clip = relationship("Clip", back_populates="comments")
    user = relationship("User", back_populates="comments")
    
    # Self-referential for replies
    parent = relationship("Comment", remote_side=[id], backref="replies")