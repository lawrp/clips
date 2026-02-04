import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { StatusType } from '../../models/auth.model';
import { PasswordRequest } from '../../models/auth.model';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './recover-page.html',
  styleUrl: './recover-page.scss',
})
export class RecoverPage {
  authService = inject(AuthService);
  router = inject(Router);

  statusMessage = signal<string>('');
  statusType = signal<StatusType>('success');

  usernameOption = signal<boolean>(false);
  passwordOption = signal<boolean>(false);

  email = signal<string>('');
  username = signal<string>('');

  isSubmitting = signal<boolean>(false);
  isError = signal<boolean>(false);

  toggleUsernameRecovery() {
    this.usernameOption.set(!this.usernameOption());
  }

  togglePasswordRecovery() {
    this.passwordOption.set(!this.passwordOption());
    this.email.set('');
    this.username.set('');
  }

  recoverUsername(emailForm: NgForm) {
    if (emailForm.invalid) {
      this.statusMessage.set('Please enter a valid email address');
      this.statusType.set('error');
      return;
    }

    this.isSubmitting.set(true);
    this.statusMessage.set('');

    this.authService.recoverUsername(this.email()).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.statusMessage.set("If that email exists, we've sent your username to it.");
        this.statusType.set('success');
        emailForm.reset();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.statusMessage.set('Failed to send recovery email. Please try again.');
        this.statusType.set('error');
        console.error('Error recovering username', err);
      },
    });
  }

  recoverPassword(passwordForm: NgForm) {
    if (passwordForm.invalid) {
      this.statusMessage.set('Please enter a valid email address');
      this.statusType.set('error');
      return;
    }

    this.isSubmitting.set(true);
    this.statusMessage.set('');

    const passwordRequest: PasswordRequest = {
      username: passwordForm.value.username,
      email: passwordForm.value.email,
    };

    this.authService
      .recoverPassword(passwordRequest)
      .subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          this.statusMessage.set(
            "If that account exists, we've sent you steps to recover your password.",
          );
          this.statusType.set('success');
          passwordForm.reset();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.statusMessage.set('Failed to send recovery email. Please try again.');
          this.statusType.set('error');
          console.error('Error recovering username', err);
        },
      });
  }

  goBackHome() {
    this.router.navigate(['/login']);
  }
}
