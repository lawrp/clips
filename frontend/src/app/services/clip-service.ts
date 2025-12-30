import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { Clip } from '../models/clip.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ClipService {
  httpClient = inject(HttpClient);
  apiUrl = environment.apiUrl;

  getClipsByUserId(userId: number): Observable<Clip[]> {
    return this.httpClient.get<Clip[]>(`${this.apiUrl}/api/clips`, 
      { params: { user_id: userId } 
    });
  }

  getVideoUrl(clipId: number): string {
    return `${this.apiUrl}/api/clips/${clipId}/video`;
  }

}
