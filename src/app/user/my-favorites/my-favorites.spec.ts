import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyFavorites } from './my-favorites';

describe('MyFavorites', () => {
  let component: MyFavorites;
  let fixture: ComponentFixture<MyFavorites>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MyFavorites]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyFavorites);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
