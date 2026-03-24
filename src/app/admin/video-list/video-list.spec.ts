import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoList } from './video-list';

describe('VideoList', () => {
  let component: VideoList;
  let fixture: ComponentFixture<VideoList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VideoList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
