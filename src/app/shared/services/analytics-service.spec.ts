import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AnalyticsService } from './analytics-service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AnalyticsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should fetch analytics overview and course learner breakdown', () => {
    service.getOverview().subscribe();
    const ovReq = httpMock.expectOne((r) => r.url.endsWith('/api/admin/analytics/overview'));
    expect(ovReq.request.method).toBe('GET');
    ovReq.flush({ courses: [] });

    service.getCourseLearners(3).subscribe();
    const lrReq = httpMock.expectOne((r) => r.url.endsWith('/api/admin/analytics/courses/3/learners'));
    expect(lrReq.request.method).toBe('GET');
    lrReq.flush([]);
  });
});
