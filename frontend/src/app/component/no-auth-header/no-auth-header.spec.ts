import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoAuthHeader } from './no-auth-header';

describe('NoAuthHeader', () => {
  let component: NoAuthHeader;
  let fixture: ComponentFixture<NoAuthHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoAuthHeader]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoAuthHeader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
