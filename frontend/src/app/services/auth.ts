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
import {
  LoginRequest,
  PasswordRequest,
  PasswordResetRequest,
  RegisterRequest,
  TokenResponse,
  User,
} from '../models/auth.model';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // Renamed from Auth
  private httpClient = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Signal-based state (new)
  currentUser = signal<User | null>(null);
  isAuthenticated = computed(() => !!this.currentUser());

  // Observable-based state (existing - keep for backward compatibility)
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  private authInitializedSubject = new BehaviorSubject<boolean>(false);
  readonly authInitialized$ = this.authInitializedSubject.asObservable();

  readonly isAuthenticated$ = combineLatest([this.authInitialized$, this.currentUser$]).pipe(
    filter(([initialized]) => initialized),
    map(([_, user]) => !!user),
    distinctUntilChanged(),
  );

  initializeAuth(): void {
    this.httpClient
      .get<User>(`${this.apiUrl}/api/users/me`, {
        withCredentials: true,
      })
      .subscribe({
        next: (user) => {
          this.setUser(user);
          this.authInitializedSubject.next(true);
        },
        error: () => {
          this.setUser(null);
          this.authInitializedSubject.next(true);
        },
      });
  }

  login(credentials: LoginRequest) {
    const formData = new URLSearchParams();
    formData.set('username', credentials.username);
    formData.set('password', credentials.password);

    return this.httpClient
      .post<{ username: string }>(`${this.apiUrl}/api/login`, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        withCredentials: true,
      })
      .pipe(
        switchMap(() =>
          this.httpClient.get<User>(`${this.apiUrl}/api/users/me`, {
            withCredentials: true,
          }),
        ),
        tap((user) => {
          this.setUser(user);
          this.authInitializedSubject.next(true);
        }),
      );
  }

  register(data: RegisterRequest) {
    return this.httpClient.post<User>(`${this.apiUrl}/api/register`, data);
  }

  logout() {
    return this.httpClient.post(`${this.apiUrl}/api/logout`, {});
  }

  // Helper method to update both signal and BehaviorSubject
  private setUser(user: User | null): void {
    this.currentUser.set(user);
    this.currentUserSubject.next(user);
  }

  clearUser() {
    this.setUser(null);
  }

  recoverUsername(email: string) {
    return this.httpClient.post(
      `${this.apiUrl}/api/recover-username`,
      { email },
      {
        withCredentials: true,
      },
    );
  }

  recoverPassword(details: PasswordRequest) {
    return this.httpClient.post(
      `${this.apiUrl}/api/request-password-reset`,
      {
        username: details.username,
        email: details.email,
      },
      {
        withCredentials: true,
      },
    );
  }

  resetPassword(details: PasswordResetRequest) {
    return this.httpClient.post(`${this.apiUrl}/api/reset-password`, details, {
      withCredentials: true,
    });
  }

  refreshUser(): Observable<User> {
    return this.fetchCurrentUser();
  }

  fetchCurrentUser(): Observable<User> {
    return this.httpClient
      .get<User>(`${this.apiUrl}/api/users/me`, {
        withCredentials: true,
      })
      .pipe(
        tap((user) => {
          this.currentUserSubject.next(user);
        }),
      );
  }
}
