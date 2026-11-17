import { TestBed } from '@angular/core/testing';

import { UtilityService } from './utility-service';

describe('UtilityService', () => {
  let service: UtilityService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UtilityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should format durations accurately', () => {
    expect(service.formatDuration(0)).toBe('0:00');
    expect(service.formatDuration(65)).toBe('01:05');
    expect(service.formatDuration(3665)).toBe('01:01:05');
  });

  it('should format file sizes accurately', () => {
    expect(service.formatFileSize(512)).toBe('512 B');
    expect(service.formatFileSize(2048)).toBe('2.0 KB');
    expect(service.formatFileSize(1048576)).toBe('1.0 MB');
  });
});
