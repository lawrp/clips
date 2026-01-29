import { Injectable, signal } from '@angular/core';

export interface SnackbarMessage {
  message: string;
  type: 'success' | 'error' | 'info'
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class SnackbarService {
  private messageSignal = signal<SnackbarMessage | null>(null);
  message$ = this.messageSignal.asReadonly();

  show(message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 3000) {
    this.messageSignal.set({ message, type, duration });

    setTimeout(() => {
      this.hide();
    }, duration);
  }

   hide() {
    this.messageSignal.set(null);
  }

}
