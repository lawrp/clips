import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class Comment {
  httpClient = inject(HttpClient);
  apiUrl = environment.apiUrl;

  getCommentsByVideoId(id: number) {
    
  }
}
