import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { CommentResponse, CommentCreate } from '../../models/comment.model';
import { AuthService } from '../../services/auth';
import { FormsModule } from '@angular/forms';
import { CommentService } from '../../services/comment';
import { ProfileService } from '../../services/profile';
import { ProfilePicture } from '../profile-picutre/profile-picture';

@Component({
  selector: 'app-comment',
  imports: [FormsModule, ProfilePicture],
  templateUrl: './comment.html',
  styleUrl: './comment.scss',
})
export class Comment implements OnInit {
  @Input() comment!: CommentResponse;

  @Output() delete = new EventEmitter<number>();
  @Output() edit = new EventEmitter<CommentResponse>();
  @Output() reply = new EventEmitter<CommentCreate>();
  @Output() like = new EventEmitter<number>();
  @Output() dislike = new EventEmitter<number>();

  authService: AuthService = inject(AuthService);
  commentsService: CommentService = inject(CommentService);
  profileService: ProfileService = inject(ProfileService);

  isEditing = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  commentMessage = signal<string>('');
  showReplyForm = signal<boolean>(false);
  userHasLiked = signal<boolean>(false);
  userHasDisliked = signal<boolean>(false);
  replyMessage = signal<string>('');

  showReplies = signal<boolean>(false);
  replies = signal<CommentResponse[]>([]);

  profilePicUrl = signal<string | null>(null);

  ngOnInit() {
    this.userHasLiked.set(this.comment.user_has_liked);
    this.userHasDisliked.set(this.comment.user_has_disliked);
    this.commentMessage.set(this.comment.message);

    this.profileService.getUserProfilePicture(this.comment.commenter_id).subscribe({
      next: (res) => this.profilePicUrl.set(res.profile_picture_url),
      error: (err) => console.error(err)
    });
  }

  get isOwnComment(): boolean {
    return this.authService.currentUser()?.id === this.comment.commenter_id;
  }

  get timeAgo(): string {
    const now = new Date();
    const commentDate = new Date(this.comment.created_at);
    const seconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return commentDate.toLocaleDateString();
  }

  toggleReplies() {
    if (!this.showReplies() && this.replies().length === 0) {
      this.loadReplies();
    }
    this.showReplies.set(!this.showReplies());
  }

  loadReplies() {
    this.commentsService.getCommentsByVideoId(this.comment.video_id).subscribe((comments) => {
      this.replies.set(comments.filter((c) => c.parent_comment_id === this.comment.id));
    });
  }

  onDelete() {
    if (confirm('Are you sure you want to delete this comment?')) {
      this.delete.emit(this.comment.id);
    }
  }

  onEdit() {
    this.isEditing.set(!this.isEditing());
  }

  onReply() {
    this.replyMessage.set('');
    this.showReplyForm.set(!this.showReplyForm());
  }

  onLike() {
    this.like.emit(this.comment.id);
  }

  onDislike() {
    this.dislike.emit(this.comment.id);
  }

  onPostEdit() {
    this.comment.message = this.commentMessage();
    this.edit.emit(this.comment);
    this.onEdit();
  }

  onCancelEdit() {
    this.commentMessage.set(this.comment.message);
    this.onEdit();
  }

  onPostReply() {
    const message = this.replyMessage().trim();

    if (!message) {
      return;
    }

    this.isSubmitting.set(true);

    const newReply: CommentCreate = {
      video_id: this.comment.video_id,
      message: message,
      parent_comment_id: this.comment.id,
    };

    this.reply.emit(newReply);
    this.isSubmitting.set(false);
    this.replyMessage.set('');
    this.showReplyForm.set(false);
  }

  handleReplyLike(commentId: number) {
    this.like.emit(commentId);
    setTimeout(() => {
      if (this.showReplies()) {
        this.loadReplies();
      }
    }, 50);
  }

  handleReplyDislike(commentId: number) {
    this.dislike.emit(commentId);
    setTimeout(() => {
      if (this.showReplies()) {
        this.loadReplies();
      }
    }, 50);
  }

  handleReplyCreate(newReply: CommentCreate) {
    this.reply.emit(newReply);
    setTimeout(() => {
      if (this.showReplies()) {
        this.loadReplies();
      }
    }, 200);
  }

  handleReplyEdit(editedComment: CommentResponse) {
    this.edit.emit(editedComment);
    setTimeout(() => {
      if (this.showReplies()) {
        this.loadReplies();
      }
    }, 200);
  }

  handleReplyDelete(commentId: number) {
    this.delete.emit(commentId);
    setTimeout(() => {
      if (this.showReplies()) {
        this.loadReplies();
      }
    }, 200);
  }
}
