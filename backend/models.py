from database import Base
from sqlalchemy import Column, Integer, String, DateTime, BigInteger, ForeignKey, Boolean, UniqueConstraint, Enum as SQLEnum
from sqlalchemy.orm import relationship, backref
from datetime import datetime, timezone
from schemas import UserRole
import enum
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    reset_token = Column(String, nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.USER)
    approved = Column(Boolean, nullable=False, default=False, server_default="0")
    
    profile_picture = Column(String, nullable=True)
    profile_picture_url = Column(String, nullable=True)
    
    clips = relationship("Clip", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    comment_likes = relationship("CommentLike", back_populates="user", cascade="all, delete-orphan")
    comment_dislikes = relationship("CommentDislike", back_populates="user", cascade="all, delete-orphan")
    clip_likes = relationship("ClipLike", back_populates="user", cascade="all, delete-orphan")
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
    likes = Column(Integer, default=0, nullable=False)
    
    user = relationship("User", back_populates="clips")
    comments = relationship("Comment", back_populates="clip", cascade="all, delete-orphan")
    likes_relation = relationship("ClipLike", back_populates="clip", cascade="all, delete-orphan")
    
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
    likes_relation = relationship("CommentLike", back_populates="comment", cascade="all, delete-orphan")
    dislikes_relation = relationship("CommentDislike", back_populates="comment", cascade="all, delete-orphan")
    
    # Self-referential for replies
    parent = relationship("Comment", remote_side=[id], backref=backref("replies", cascade="all, delete-orphan"))
    

class CommentLike(Base):
    __tablename__ = "comment-likes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    comment_id = Column(Integer, ForeignKey("comments.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (
        UniqueConstraint('user_id', 'comment_id', name='unique_comment_like'),
    )
    
    user = relationship("User", back_populates="comment_likes")
    comment = relationship("Comment", back_populates="likes_relation")

class CommentDislike(Base):
    __tablename__ = "comment_dislikes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    comment_id = Column(Integer, ForeignKey("comments.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (
        UniqueConstraint('user_id', 'comment_id', name='unique_comment_dislike'),
    )
    
    user = relationship("User", back_populates="comment_dislikes")
    comment = relationship("Comment", back_populates="dislikes_relation")

class ClipLike(Base):
    __tablename__ = "clip_likes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    clip_id = Column(Integer, ForeignKey("clips.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (
        UniqueConstraint('user_id', 'clip_id', name='unique_clip_like'),
    )
    
    user = relationship("User", back_populates="clip_likes")
    clip = relationship("Clip", back_populates="likes_relation")
    
