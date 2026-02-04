import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShareButton } from './share-button';

describe('ShareButton', () => {
  let component: ShareButton;
  let fixture: ComponentFixture<ShareButton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShareButton]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShareButton);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
