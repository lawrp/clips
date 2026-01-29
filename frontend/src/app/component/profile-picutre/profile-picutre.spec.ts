import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfilePicutre } from './profile-picutre';

describe('ProfilePicutre', () => {
  let component: ProfilePicutre;
  let fixture: ComponentFixture<ProfilePicutre>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilePicutre]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfilePicutre);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
