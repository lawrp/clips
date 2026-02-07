import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FolderProcessorService {
  
  private readonly SUPPORTED_EXTENSIONS = ['.mp4', '.webm'];
  private readonly SUPPORTED_MIME_TYPES = ['video/mp4', 'video/webm'];
  
  async processDroppedItems(dataTransfer: DataTransfer): Promise<File[]> {
    const items = dataTransfer.items;
    if (!items) {
      return this.processDroppedFiles(dataTransfer);
    }

    const videoFiles: File[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i].webkitGetAsEntry();
      if (item) {
        await this.traverseFileTree(item, videoFiles);
      }
    }

    return videoFiles;
  }

  private processDroppedFiles(dataTransfer: DataTransfer): File[] {
    const files = Array.from(dataTransfer.files);
    return files.filter(file => this.isValidVideo(file));
  }

  processSelectedFiles(fileList: FileList | null): File[] {
    if (!fileList) return [];

    const files = Array.from(fileList);
    return files.filter(file => this.isValidVideo(file));
  }

  private isValidVideo(file: File): boolean {
    const extension = this.getFileExtension(file.name);
    const hasValidExtension = this.SUPPORTED_EXTENSIONS.includes(extension);
    const hasValidMimeType = this.SUPPORTED_MIME_TYPES.includes(file.type);
    
    return hasValidExtension && hasValidMimeType;
  }

  private getFileExtension(filename: string): string {
    return filename.toLowerCase().slice(filename.lastIndexOf('.'));
  }

  private async traverseFileTree(item: FileSystemEntry, videoFiles: File[]): Promise<void> {
    if (item.isFile) {
      const fileEntry = item as FileSystemFileEntry;
      const extension = this.getFileExtension(fileEntry.name);

      if (this.SUPPORTED_EXTENSIONS.includes(extension)) {
        const file = await this.getFileFromEntry(fileEntry);
        if (file && this.isValidVideo(file)) {
          videoFiles.push(file);
        }
      }
    } else if (item.isDirectory) {
      const dirEntry = item as FileSystemDirectoryEntry;
      const dirReader = dirEntry.createReader();

      const entries = await this.readAllDirectoryEntries(dirReader);

      for (const entry of entries) {
        await this.traverseFileTree(entry, videoFiles);
      }
    }
  }

  private getFileFromEntry(fileEntry: FileSystemFileEntry): Promise<File | null> {
    return new Promise((resolve) => {
      fileEntry.file(
        (file) => resolve(file),
        (error) => {
          console.error('Error reading file:', error);
          resolve(null);
        }
      );
    });
  }

  private readAllDirectoryEntries(dirReader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
    return new Promise((resolve, reject) => {
      const entries: FileSystemEntry[] = [];

      const readEntries = () => {
        dirReader.readEntries((results) => {
          if (results.length === 0) {
            resolve(entries);
          } else {
            entries.push(...results);
            readEntries();
          }
        }, (error) => reject(error));
      };
      readEntries();
    });
  }
}