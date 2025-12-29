import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Clip } from './clip';

describe('Clip', () => {
  let component: Clip;
  let fixture: ComponentFixture<Clip>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Clip]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Clip);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
