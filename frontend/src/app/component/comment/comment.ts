import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { CommentResponse } from '../../models/comment.model';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-comment',
  imports: [],
  templateUrl: './comment.html',
  styleUrl: './comment.scss',
})
export class Comment {
  @Input() comment!: CommentResponse;

  @Output() delete = new EventEmitter<number>();
  @Output() edit = new EventEmitter<number>();
  @Output() reply = new EventEmitter<number>();

  authService: AuthService = inject(AuthService);
  isEditing = signal<boolean>(false);
  showReplyForm = signal<boolean>(false);

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

  onDelete() {
    if (confirm('Are you sure you want to delete this comment?')) {
      this.delete.emit(this.comment.id);
    }
  }

  onEdit() {
    this.isEditing.set(true);
  }

  onReply() {
    this.showReplyForm.set(!this.showReplyForm());
  }
}
