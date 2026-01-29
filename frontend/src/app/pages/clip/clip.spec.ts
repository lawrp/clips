import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClipPage } from './clip';

describe('Clip', () => {
  let component: ClipPage;
  let fixture: ComponentFixture<ClipPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClipPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClipPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
