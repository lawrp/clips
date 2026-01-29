import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  authService = inject(AuthService);
  router = inject(Router);
  loginStatus = signal<string>('');
  isSubmitting = signal<boolean>(false);
  isError = signal<boolean>(false);
  username: string = '';
  password: string = '';

  async onSubmit(form: NgForm) {
    if (form.invalid) {
      this.isError.set(true);
      this.loginStatus.set('Login failed!');
      return;
    }
    this.isSubmitting.set(true);

    this.authService.login({ username: this.username, password: this.password }).subscribe({
      next: () => {
        console.log('Login successful, navigating to dashboard...');
        this.router.navigate(['/dashboard'], { replaceUrl: true });
        console.log('navigating to dashboard!');
      },
      error: (e) => {
        console.log('Login error');
        this.loginStatus.set(e.error.detail);
        this.isError.set(true);
        this.isSubmitting.set(false);
      },
    });
  }
}
