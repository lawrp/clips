import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FolderProcessorService {
  
  async processDroppedItems(dataTransfer: DataTransfer): Promise<File[]> {
    const items = dataTransfer.items;
    if (!items) {
      return this.processDroppedFiles(dataTransfer);
    }

    const mp4Files: File[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i].webkitGetAsEntry();
      if (item) {
        await this.traverseFileTree(item, mp4Files);
      }
    }

    return mp4Files
  }

  private processDroppedFiles(dataTransfer: DataTransfer): File[] {
    const files = Array.from(dataTransfer.files);
    return files.filter(file => this.isMP4(file));
  }

  processSelectedFiles(fileList: FileList | null): File[] {
    if (!fileList) return [];

    const files = Array.from(fileList);
    return files.filter(file => this.isMP4(file));
  }

  private isMP4(file: File): boolean {
    return file.name.toLowerCase().endsWith('.mp4') && file.type === 'video/mp4'
  }

  private async traverseFileTree(item: FileSystemEntry, mp4Files: File[]): Promise<void> {
    if (item.isFile) {
      const fileEntry = item as FileSystemFileEntry;

      if (fileEntry.name.toLowerCase().endsWith('.mp4')) {
        const file = await this.getFileFromEntry(fileEntry);
        if (file && this.isMP4(file)) {
          mp4Files.push(file);
        }
      }
    } else if (item.isDirectory) {
      const dirEntry = item as FileSystemDirectoryEntry;
      const dirReader = dirEntry.createReader();

      const entries = await this.readAllDirectoryEntries(dirReader);

      for (const entry of entries) {
        await this.traverseFileTree(entry, mp4Files);
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
      )
    })
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
    })
  }
}
