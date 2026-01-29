// register.component.ts
import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  authService = inject(AuthService);
  router = inject(Router);
  
  registerStatus = signal<string>('');
  isSubmitting = signal<boolean>(false);
  isError = signal<boolean>(false);
  isSuccess = signal<boolean>(false);
  
  username: string = '';
  password: string = '';
  confirmPassword: string = '';
  email: string = '';
  confirmEmail: string = '';

  onSubmit(form: NgForm) {
    if (form.invalid || this.password !== this.confirmPassword) {
      this.isError.set(true);
      this.registerStatus.set('Please check your inputs');
      return;
    }

    this.isSubmitting.set(true);

    this.authService.register({ username: this.username, email: this.email, password: this.password })
      .subscribe({
        next: () => {
          this.isSuccess.set(true);
          this.isError.set(false);
          this.registerStatus.set('Account created! Redirecting...');
          
          // Auto-login after registration
          setTimeout(() => {
            this.authService.login({ username: this.username, password: this.password })
              .subscribe({
                next: () => {
                  this.router.navigate(['/dashboard']);
                },
                error: () => {
                  this.router.navigate(['/login']);
                }
              });
          }, 1000);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.isError.set(true);
          this.registerStatus.set(err.error?.detail || 'Registration failed!');
        }
      });
  }
}