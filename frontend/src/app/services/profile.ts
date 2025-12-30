import { HttpClient } from '@angular/common/http';
import { inject, Injectable, Input, OnInit } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { BehaviorSubject } from 'rxjs';
import { User } from '../models/auth.model';

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
}
