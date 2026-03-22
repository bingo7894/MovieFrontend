import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerfyEmail } from './verfy-email';

describe('VerfyEmail', () => {
  let component: VerfyEmail;
  let fixture: ComponentFixture<VerfyEmail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VerfyEmail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerfyEmail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
