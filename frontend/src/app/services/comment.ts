import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.development';
import { CommentCreate, CommentResponse, CommentUpdate } from '../models/comment.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CommentService {
  httpClient = inject(HttpClient);
  apiUrl = environment.apiUrl;

  getCommentsByVideoId(id: number, include_deleted: boolean = false): Observable<CommentResponse[]> {
    return this.httpClient.get<CommentResponse[]>(`${this.apiUrl}/api/clips/${id}/comments`, {
      params: { include_deleted: include_deleted },
    });
  }

  createComment(commentData: CommentCreate): Observable<CommentResponse> {
    return this.httpClient.post<CommentResponse>(`${this.apiUrl}/api/comments`, commentData);
  }

  deleteComment(commentId: number): Observable<void> {
    return this.httpClient.delete<void>(`${this.apiUrl}/api/comments/${commentId}`);
  }

  updateComment(commentId: number, commentData: CommentUpdate): Observable<CommentResponse> {
    return this.httpClient.put<CommentResponse>(`${this.apiUrl}/api/comments/${commentId}`, commentData)
  }

  likeComment(commentId: number): Observable<any> {
    return this.httpClient.post(`${this.apiUrl}/api/comments/${commentId}/like`, {});
  }

  dislikeComment(commentId: number): Observable<any> {
    return this.httpClient.post(`${this.apiUrl}/api/comments/${commentId}/dislike`, {});
  }
}
