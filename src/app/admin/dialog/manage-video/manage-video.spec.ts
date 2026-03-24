import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageVideo } from './manage-video';

describe('ManageVideo', () => {
  let component: ManageVideo;
  let fixture: ComponentFixture<ManageVideo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ManageVideo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageVideo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
