import { HttpClient, HttpEvent } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { Clip, ClipLikeResponse, ClipUpdate } from '../models/clip.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ClipService {
  httpClient = inject(HttpClient);
  apiUrl = environment.apiUrl;

  getClipsByUserId(userId: number): Observable<Clip[]> {
    return this.httpClient.get<Clip[]>(`${this.apiUrl}/api/clips`, { params: { user_id: userId } });
  }

  getVideoUrl(clipId: number): string {
    return `${this.apiUrl}/api/clips/${clipId}/video`;
  }

  getAllClips(): Observable<Clip[]> {
    return this.httpClient.get<Clip[]>(`${this.apiUrl}/api/clips`);
  }

  uploadClip(file: File, title: string, description?: string): Observable<HttpEvent<Clip>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', description || '');

    return this.httpClient.post<Clip>(`${this.apiUrl}/api/clips/upload`, formData, {
      reportProgress: true,
      observe: 'events',
    });
  }

  getClipById(video_id: number): Observable<Clip> {
    return this.httpClient.get<Clip>(`${this.apiUrl}/api/clips/${video_id}`);
  }

  likeClipById(video_id: number): Observable<ClipLikeResponse> {
    return this.httpClient.post<ClipLikeResponse>(`${this.apiUrl}/api/clips/${video_id}/like`, {})
  }

  updateClipById(clipUpdate: ClipUpdate, video_id: number) {
    return this.httpClient.patch<Clip>(`${this.apiUrl}/api/clips/${video_id}`, clipUpdate)
  }

  deleteClipById(video_id: number) {
    return this.httpClient.delete<void>(`${this.apiUrl}/api/clips/${video_id}`);
  }
}
