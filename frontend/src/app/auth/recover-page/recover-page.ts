import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './recover-page.html',
  styleUrl: './recover-page.scss',
})
export class RecoverPage {
  authService = inject(AuthService);
  router = inject(Router);

  usernameOption = signal<boolean>(false);
  passwordOption = signal<boolean>(false);

  email = signal<string>('');
  username = signal<string>('');

  isSubmitting = signal<boolean>(false);
  isError = signal<boolean>(false);

  toggleUsernameRecovery() {
    this.usernameOption.set(true);
  }

  togglePasswordRecovery() {
    this.passwordOption.set(true);
  }

  recoverUsername(usernameForm: NgForm) {
    this.isSubmitting.set(true);
  }

  recoverPassword() {

  }



}
