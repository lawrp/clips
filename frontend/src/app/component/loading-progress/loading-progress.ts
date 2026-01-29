import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-progress',
  imports: [],
  templateUrl: './loading-progress.html',
  styleUrl: './loading-progress.scss',
})
export class LoadingProgress {
  @Input() progress: number = 0;
  @Input() height: string = '8px';
  @Input() showPercentage: boolean = true;
  @Input() color: string = 'primary';
}
