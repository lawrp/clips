import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  Observable,
  switchMap,
  tap,
} from 'rxjs';
import { LoginRequest, RegisterRequest, TokenResponse, User } from '../models/auth.model';
import { Clip } from '../models/clip.model';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private httpClient = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  private authInitializedSubject = new BehaviorSubject<boolean>(false);
  readonly authInitialized$ = this.authInitializedSubject.asObservable();

  readonly isAuthenticated$ = combineLatest([this.authInitialized$, this.currentUser$]).pipe(
    filter(([initialized]) => initialized),
    map(([_, user]) => !!user),
    distinctUntilChanged()
  );

  initializeAuth(): void {
    const token = localStorage.getItem('token');

    if (!token) {
      this.currentUserSubject.next(null);
      this.authInitializedSubject.next(true);
      return;
    }

    this.httpClient.get<User>(`${this.apiUrl}/api/users/me`).subscribe({
      next: (user) => {
        this.currentUserSubject.next(user);
        this.authInitializedSubject.next(true);
      },
      error: () => {
        this.clearSession();
        this.authInitializedSubject.next(true);
      },
    });
  }

  login(credentials: LoginRequest) {
    const formData = new URLSearchParams();
    formData.set('username', credentials.username);
    formData.set('password', credentials.password);

    return this.httpClient
      .post<TokenResponse>(`${this.apiUrl}/api/login`, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
      .pipe(
        tap((response) => {
          localStorage.setItem('token', response.access_token);
        }),
        switchMap(() => this.httpClient.get<User>(`${this.apiUrl}/api/users/me`)),
        tap((user) => {
          this.currentUserSubject.next(user);
          this.authInitializedSubject.next(true);
        })
      );
  }

  register(data: RegisterRequest) {
    return this.httpClient.post<User>(`${this.apiUrl}/api/register`, data);
  }

  private loadCurrentUser(): void {
    this.httpClient.get<User>(`${this.apiUrl}/api/users/me`).subscribe({
      next: (user) => {
        this.currentUserSubject.next(user);
        this.authInitializedSubject.next(true);
      },
      error: () => {
        this.clearSession();
        this.authInitializedSubject.next(true);
      },
    });
  }

  logout() {
    this.clearSession();
  }

  private clearSession(): void {
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
  }
}
