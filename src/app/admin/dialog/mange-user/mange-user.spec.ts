import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MangeUser } from './mange-user';

describe('MangeUser', () => {
  let component: MangeUser;
  let fixture: ComponentFixture<MangeUser>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MangeUser]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MangeUser);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
