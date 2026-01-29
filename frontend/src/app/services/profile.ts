import { HttpClient } from '@angular/common/http';
import { inject, Injectable, Input, OnInit } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, ProfilePictureResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private httpClient = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private currentProfileData = new BehaviorSubject<User | null>(null);
  readonly currentProfile$ = this.currentProfileData.asObservable();

  getProfileData(username: string) {
    return this.httpClient.get<User>(`${this.apiUrl}/api/users/${username}`);
  }

  uploadProfilePicture(file: File): Observable<ProfilePictureResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.httpClient.post<ProfilePictureResponse>(
      `${this.apiUrl}/api/profile/upload-picture`,
      formData,
    );
  }

  deleteProfilePicture(): Observable<{ message: string }> {
    return this.httpClient.delete<{ message: string }>(`${this.apiUrl}/api/profile/delete-picture`);
  }
  getUserProfilePicture(
    userId: number,
  ): Observable<{ user_id: number; profile_picture_url: string | null }> {
    return this.httpClient.get<{ user_id: number; profile_picture_url: string | null }>(
      `${this.apiUrl}/api/users/${userId}/profile-picture`,
    );
  }
}
