import { HttpClient } from '@angular/common/http';
import { inject, Injectable, Input, OnInit } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { BehaviorSubject, Observable, tap, switchMap } from 'rxjs';
import { User, ProfilePictureResponse } from '../models/auth.model';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private httpClient = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private authService = inject(AuthService)

  private currentProfileData = new BehaviorSubject<User | null>(null);
  readonly currentProfile$ = this.currentProfileData.asObservable();

  getProfileData(username: string) {
    return this.httpClient.get<User>(`${this.apiUrl}/api/users/${username}`);
  }

  uploadProfilePicture(file: File): Observable<User> {
    const formData = new FormData();
    formData.append('file', file);

    return this.httpClient.post<User>(
      `${this.apiUrl}/api/profile/upload-picture`,
      formData,
    ).pipe(
      switchMap(() => this.authService.refreshUser())
    );
  }

  deleteProfilePicture(): Observable<User> {
    return this.httpClient.delete<User>(`${this.apiUrl}/api/profile/delete-picture`).pipe(
      switchMap(() => this.authService.refreshUser())
    );
  }


  getUserProfilePicture(
    userId: number,
  ): Observable<{ user_id: number; profile_picture_url: string | null }> {
    return this.httpClient.get<{ user_id: number; profile_picture_url: string | null }>(
      `${this.apiUrl}/api/users/${userId}/profile-picture`,
    );
  }
}
