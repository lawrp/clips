// upload.component.ts
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Auth } from '../../services/auth';
import { SnackbarService } from '../../services/snackbar';
import { LoadingProgress } from '../../component/loading-progress/loading-progress';
import { environment } from '../../../environments/environment.development';

@Component({
  selector: 'app-upload',
  imports: [FormsModule, LoadingProgress],
  templateUrl: './upload.html',
  styleUrl: './upload.scss'
})
export class Upload {
  private httpClient = inject(HttpClient);
  private authService = inject(Auth);
  private router = inject(Router);
  private snackbarService = inject(SnackbarService);
  private apiUrl = environment.apiUrl;

  title = signal<string>('');
  description = signal<string>('');
  selectedFile = signal<File | null>(null);
  fileName = signal<string>('');
  uploadProgress = signal<number>(0);
  isUploading = signal<boolean>(false);

  maxFileSize = 1024 * 1024 * 1024; // 1GB

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validate file type
      if (!file.type.startsWith('video/')) {
        this.snackbarService.show('Please select a video file', 'error');
        return;
      }

      // Validate file size
      if (file.size > this.maxFileSize) {
        this.snackbarService.show('File size must be less than 1GB', 'error');
        return;
      }

      this.selectedFile.set(file);
      this.fileName.set(file.name);
    }
  }

  onSubmit() {
    if (!this.selectedFile() || !this.title()) {
      this.snackbarService.show('Please fill in all required fields', 'error');
      return;
    }

    this.isUploading.set(true);
    this.uploadProgress.set(0);

    const formData = new FormData();
    formData.append('file', this.selectedFile()!);
    formData.append('title', this.title());
    formData.append('description', this.description() || '');

    this.httpClient.post(`${this.apiUrl}/api/clips/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const progress = Math.round(100 * event.loaded / event.total);
          this.uploadProgress.set(progress);
        } else if (event.type === HttpEventType.Response) {
          this.snackbarService.show('Clip uploaded successfully!', 'success');
          setTimeout(() => {
            this.router.navigate(['/profile/me']);
          }, 1500);
        }
      },
      error: (err) => {
        this.isUploading.set(false);
        this.uploadProgress.set(0);
        this.snackbarService.show(
          err.error?.detail || 'Upload failed. Please try again.', 
          'error'
        );
      }
    });
  }

  cancelUpload() {
    this.selectedFile.set(null);
    this.fileName.set('');
    this.title.set('');
    this.description.set('');
    this.uploadProgress.set(0);
  }

  goToProfile() {
    this.router.navigate(['/profile/me']);
  }
}