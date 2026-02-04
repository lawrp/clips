import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { CommentResponse, CommentCreate, CommentUpdate} from '../../models/comment.model';
import { CommentService } from '../../services/comment';
import { Comment } from '../comment/comment';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { SnackbarService } from '../../services/snackbar';
import { ProfilePicture } from '../profile-picutre/profile-picture';
import { AsyncPipe } from '@angular/common';


@Component({
  selector: 'app-comments-section',
  imports: [Comment, FormsModule, ProfilePicture, AsyncPipe],
  templateUrl: './comments-section.html',
  styleUrl: './comments-section.scss',
})
export class CommentsSection implements OnInit {
  @Input() clipId!: number;

  comments = signal<CommentResponse[]>([]);
  replies = signal<CommentResponse[]>([]);
  commentMessage = signal<string>('');
  isSubmitting = signal<boolean>(false);

  commentsService = inject(CommentService);
  authService = inject(AuthService);
  snackbarService = inject(SnackbarService);

  ngOnInit() {
    this.loadComments();
  }

  loadComments() {
    this.commentsService.getCommentsByVideoId(this.clipId).subscribe(comments => {
      this.comments.set(comments.filter((comment) => !comment.parent_comment_id));
    });
  };

  handleDelete(commentId: number) {
    this.commentsService.deleteComment(commentId).subscribe(() => {
      this.loadComments();
    });
  };

  postComment() {
    const message = this.commentMessage().trim();

    if (!message) {
      return;
    }

    this.isSubmitting.set(true);

    const newComment: CommentCreate = {
      video_id: this.clipId,
      message: message,
      parent_comment_id: null
    };

    this.commentsService.createComment(newComment).subscribe({
      next: (res) => {
        this.commentMessage.set('');
        this.loadComments();
        this.isSubmitting.set(false);
        this.snackbarService.show('Comment saved successfully...', 'success', 3000);
      },
      error: (err) => {
        console.error('Error posting comment:', err);
        this.isSubmitting.set(false);
        this.snackbarService.show(err, 'error', 3000);
      }
    })
  }

  handleLike(commentId: number) {
    this.commentsService.likeComment(commentId).subscribe({
      next: (res) => {
        this.loadComments();
      },
      error: (err) => {
        this.snackbarService.show('There was an error liking the comment!', 'error', 3000);
        console.error(err);
      }
    });
  }

  handleDislike(commentId: number) {
    this.commentsService.dislikeComment(commentId).subscribe({
      next: () => {
        this.loadComments();
      },
      error: (err) => {
        this.snackbarService.show('There was an error disliking the comment!', 'error', 3000);
        console.error(err);
      }
    });
  }

  handleEdit(comment: CommentResponse) {
    
    this.commentsService.updateComment(comment.id, { "message": comment.message }).subscribe({
      next: () => {
        this.loadComments();
        this.snackbarService.show('Comment was updated successfully!', 'success', 3000);
      },
      error: (err) => {
        this.snackbarService.show("There was an error updating comment!", 'error', 3000);
      }
    })
  }

  handleReply(reply: CommentCreate) {
    this.commentsService.createComment(reply).subscribe({
      next: () => {
        this.loadComments();
        this.snackbarService.show('Reply posted successfully!', 'success', 3000);
      },
      error: (err) => {
        console.error('Error posting reply:', err);
        this.snackbarService.show('Error posting reply', 'error', 3000);
      } 
    });
  }
}
