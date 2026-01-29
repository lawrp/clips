import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { SnackbarService } from '../../services/snackbar';
import { FormsModule, NgForm } from '@angular/forms';
import { PasswordResetRequest, StatusType } from '../../models/auth.model';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword {
  route = inject(ActivatedRoute);
  token = signal<string>('');
  router = inject(Router);
  authService = inject(AuthService);
  snackbarService = inject(SnackbarService);

  password = signal<string>('');
  confirmPassword = signal<string>('');

  isSubmitting = signal<boolean>(false);
  statusType = signal<StatusType>('success');
  statusMessage = signal<string>('');

  goBackToLogin() {
    this.router.navigate(['/login'])
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (!token) {
        this.statusMessage.set('Invalid or missing reset token');
        this.statusType.set('error');
      } else {
        this.token.set(token);
      }
    });
  }

  onSubmit(passwordForm: NgForm) {
    if (passwordForm.invalid) {
      this.statusMessage.set('Please fill in all required fields');
      this.statusType.set('error');
      return;
    }

    if (this.password() !== this.confirmPassword()) {
      this.statusMessage.set('Passwords do not match');
      this.statusType.set('error');
      return;
    }

    if (!this.token()) {
      this.statusMessage.set('Invalid reset token');
      this.statusType.set('error');
      return;
    }

    this.isSubmitting.set(true);
    this.statusMessage.set('');

    const resetRequest: PasswordResetRequest = {
      token: this.token(),
      new_password: this.password()
    }


    this.authService.resetPassword(resetRequest).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.statusMessage.set('Password reset successful! Redirecting to login...');
        this.statusType.set('success');
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.statusMessage.set(err.error?.detail || 'Failed to reset password. Token may be invalid or expired.');
        this.statusType.set('error');
        console.error('Error resetting password', err);
      }
    });
  }
}
