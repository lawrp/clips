import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClipThumbnail } from './clip-thumbnail';

describe('ClipThumbnail', () => {
  let component: ClipThumbnail;
  let fixture: ComponentFixture<ClipThumbnail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClipThumbnail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClipThumbnail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
