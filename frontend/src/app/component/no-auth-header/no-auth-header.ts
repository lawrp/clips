import { Component, inject } from '@angular/core';
import { AuthService } from '../../services/auth';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-no-auth-header',
  imports: [RouterLink],
  templateUrl: './no-auth-header.html',
  styleUrl: './no-auth-header.scss',
})
export class NoAuthHeader {
  authService = inject(AuthService);
  router = inject(Router);
  
}
