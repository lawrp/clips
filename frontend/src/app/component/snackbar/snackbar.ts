import { Component, inject } from '@angular/core';
import { SnackbarService } from '../../services/snackbar';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-snackbar',
  imports: [CommonModule],
  templateUrl: './snackbar.html',
  styleUrl: './snackbar.scss'
})
export class Snackbar {
  snackbarService = inject(SnackbarService);
  message$ = this.snackbarService.message$;
}