import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class VolumeService {
  private readonly STORAGE_KEY = 'clips_volume';
  private readonly DEFAULT_VOLUME = 0.5;

  volume = signal<number>(this.loadVolume());

  setVolume(value: number) {
    const clamped = Math.max(0, Math.min(1, value));
    this.volume.set(clamped);
    localStorage.setItem(this.STORAGE_KEY, clamped.toString());
  }

  private loadVolume(): number {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? parseFloat(stored) : this.DEFAULT_VOLUME;
  }
  
}
