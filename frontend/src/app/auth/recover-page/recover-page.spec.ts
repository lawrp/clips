import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecoverPage } from './recover-page';

describe('RecoverPage', () => {
  let component: RecoverPage;
  let fixture: ComponentFixture<RecoverPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecoverPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecoverPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
