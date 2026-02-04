import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { Observable } from 'rxjs';
import { User } from '../models/auth.model';
import { AdminStats, UserApprovalUpdate, UserRole, UserRoleUpdate } from '../models/roles.model';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private httpClient = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getAllUsers(params?: {
    skip?: number;
    limit?: number;
    role_filter?: string;
    approval_filter?: boolean;
    search?: string;
  }): Observable<User[]> {
    return this.httpClient.get<User[]>(`${this.apiUrl}/api/admin/users`, {params})
  }

  getAdminStats(): Observable<AdminStats> {
    return this.httpClient.get<AdminStats>(`${this.apiUrl}/api/admin/stats`);
  }

  updateUserRole(userId: number, role: UserRole): Observable<UserRoleUpdate> {
    return this.httpClient.patch<UserRoleUpdate>(`${this.apiUrl}/api/admin/users/${userId}/role`, { role })
  }

  updateUserApproval(userId: number, approved: boolean): Observable<UserApprovalUpdate> {
    return this.httpClient.patch<UserApprovalUpdate>(`${this.apiUrl}/api/admin/users/${userId}/approval`, { approved });
  }

  deleteUser(userId: number): Observable<void> {
    return this.httpClient.delete<void>(`${this.apiUrl}/api/admin/users/${userId}`);
  }
}
