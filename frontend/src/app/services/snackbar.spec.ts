import { TestBed } from '@angular/core/testing';

import { Snackbar } from '../component/snackbar/snackbar';

describe('Snackbar', () => {
  let service: Snackbar;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Snackbar);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
