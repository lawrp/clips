// upload.component.ts
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SnackbarService } from '../../services/snackbar';
import { LoadingProgress } from '../../component/loading-progress/loading-progress';
import { ClipService } from '../../services/clip-service';
import { HttpEventType } from '@angular/common/http';

@Component({
  selector: 'app-upload',
  imports: [FormsModule, LoadingProgress],
  templateUrl: './upload.html',
  styleUrl: './upload.scss',
})
export class Upload {
  private clipService = inject(ClipService);
  private router = inject(Router);
  private snackbarService = inject(SnackbarService);

  title = signal<string>('');
  description = signal<string>('');
  selectedFiles = signal<File[]>([]);

  uploadProgress = signal<number>(0);
  isUploading = signal<boolean>(false);
  currentFileIndex = signal<number>(0);

  maxFileSize = 1024 * 1024 * 1024; // 1GB

  get isSingleUpload(): boolean {
    return this.selectedFiles().length === 1;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    const validFiles = files.filter((file) => {
      this.validateFile(file);
    });

    this.selectedFiles.set(validFiles);

    if (validFiles.length === 1) {
      this.title.set(validFiles[0].name.replace(/\.[^/.]+$/, ''));
    }
  }

  validateFile(file: File): boolean {
    if (!file.type.startsWith('video/')) {
      this.snackbarService.show('Please select video files only', 'error');
      return false;
    }

    if (file.size > this.maxFileSize) {
      this.snackbarService.show(`${file.name} exceeds 1GB limit`, 'error');
      return false;
    }

    return true;
  }

  onSubmit() {
    if (this.selectedFiles().length === 0) {
      this.snackbarService.show('Please select at least one file', 'error');
      return;
    }

    if (this.isSingleUpload && !this.title()) {
      this.snackbarService.show('Please enter a title', 'error');
      return;
    }
    this.isUploading.set(true);
    this.currentFileIndex.set(0);
    this.uploadNextFile();

  }

  uploadNextFile() {
    const files = this.selectedFiles();
    const index = this.currentFileIndex();

    if (index >= files.length) {

      this.isUploading.set(false);
      const message = this.isSingleUpload ? 'Clip uploaded successfully!' :
      `Successfully uploaded ${files.length} clips!`;
      this.snackbarService.show(message, 'success');
      setTimeout(() => {
        this.goToProfile();
      }, 2000);
      return;
    }

    const file = files[index];

    const title = this.isSingleUpload ? this.title() : file.name.replace(/\.[^/.]+$/, '');
    const description = this.isSingleUpload ? this.description() : '';

    this.uploadProgress.set(0);

    this.clipService.uploadClip(file, title, description).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const progress = Math.round(100 * event.loaded / event.total);
          this.uploadProgress.set(progress);
        } else if (event.type === HttpEventType.Response) {
          this.currentFileIndex.set(index + 1);
          this.uploadNextFile();
        }
      },
      error: (e) => {
        this.snackbarService.show(`Failed to upload ${file.name}: ${e.error?.detail || 'Unknown Error!'}`, 'error');
        this.currentFileIndex.set(index + 1);
        this.uploadNextFile();
      }
    })
  }

  cancelUpload() {
    this.selectedFiles.set([]);
    this.title.set('');
    this.description.set('');
    this.uploadProgress.set(0);
  }

  removeFile(index: number) {
    const files = this.selectedFiles();
    files.splice(index, 1);
    this.selectedFiles.set([...files]);

    if (files.length === 1) {
      this.title.set(files[0].name.replace(/\.[^/.]+$/, ''));
    }
  }

  goToProfile() {
    this.router.navigate(['/profile/me']);
  }
}
