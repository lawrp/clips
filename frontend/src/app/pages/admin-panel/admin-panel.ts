import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminStats, UserRole } from '../../models/roles.model';
import { StatusType, User } from '../../models/auth.model';
import { AuthService } from '../../services/auth';
import { AdminService } from '../../services/admin-service';
import { SnackbarService } from '../../services/snackbar';
import { ProfilePicture } from '../../component/profile-picutre/profile-picture';
@Component({
  selector: 'app-admin-panel',
  imports: [FormsModule, CommonModule, RouterLink, ProfilePicture],
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.scss',
})
export class AdminPanel implements OnInit {

  authService = inject(AuthService);
  adminService = inject(AdminService);
  snackbarService = inject(SnackbarService)

  stats = signal<AdminStats | null>(null);
  users = signal<User[]>([]);


  searchTerm = signal<string>('');
  roleFilter = signal<string>('');
  approvalFilter = signal<boolean | null>(null);

  isLoading = signal<boolean>(false);
  statusMessage = signal<string>('');
  statusType = signal<StatusType>('success');

  UserRole = UserRole;

  ngOnInit() {
    this.loadStats();
    this.loadUsers();
  }

  updateRole(userId: number, event: Event) {
    const select = event.target as HTMLSelectElement
    const newRole = select.value as UserRole
    this.updateUserRole(userId, newRole);
  }

  loadStats() {
    this.adminService.getAdminStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
      }, error: (err) => {
        console.error('Error loading stats', err);
        this.snackbarService.show('Error fetching stats', 'error', 3000);
      }
    });
  }

  loadUsers() {
    this.isLoading.set(true);

    const params: any = {};
    if (this.searchTerm()) params.search = this.searchTerm();
    if (this.roleFilter()) params.role_filter = this.roleFilter();
    if (this.approvalFilter()) params.approval_filter = this.approvalFilter();

    this.adminService.getAllUsers(params).subscribe({
      next: (users) => {
        console.log(users);
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading users', err);
        this.snackbarService.show('Error fetching users...', 'error', 3000);
        this.isLoading.set(false);
      }
    });
  }

  updateUserRole(userId: number, newRole: UserRole) {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {

      this.loadUsers();
      return;
    }

    this.adminService.updateUserRole(userId, newRole).subscribe({
      next: (res) => {
        this.snackbarService.show(`User role was updated to ${res.role}!`, 'success', 3000);
        this.loadUsers();
        this.loadStats();
      },
      error: (err) => {
        this.snackbarService.show(err.error?.detail || 'Failed to update role', 'error', 3000);
        this.loadUsers();
      }
    });
  }

  toggleApproval(userId: number, currentApproval: boolean) {
    const action = currentApproval ? 'unapprove' : 'approve';
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }

    this.adminService.updateUserApproval(userId, !currentApproval).subscribe({
      next: (res) => {
        this.snackbarService.show(`User was successfully ${action}d.`, 'success', 3000);
        this.loadUsers();
        this.loadStats();
      },
      error: (err) => {
        this.snackbarService.show(err.error?.detail || 'Failed to update approval', 'error', 3000);
        this.loadUsers();
        this.loadStats();
      }
    });
  }

  deleteUser(userId: number, username: string) {
    if (!confirm(`Are you sure you want to DELETE user "${username}"? This cannot be undone!`)) {
      return;
    }

    this.adminService.deleteUser(userId).subscribe({
      next: () => {
        this.snackbarService.show(`${username} was deleted successfully`, 'success', 3000);
        this.loadUsers();
        this.loadStats();
      },
      error: (err) => {
         this.snackbarService.show(err.error?.detail || 'Failed to delete user', 'error', 3000);
      } 
    });
  }

  applyFilters() {
    this.loadUsers();
  }

  clearFilters() {
    this.searchTerm.set('');
    this.roleFilter.set('');
    this.approvalFilter.set(null);
    this.loadUsers();
  }

}
