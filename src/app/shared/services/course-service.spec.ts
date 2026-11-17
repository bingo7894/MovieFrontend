import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CourseService } from './course-service';

describe('CourseService', () => {
  let service: CourseService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CourseService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should request published courses with query params', () => {
    service.getPublishedCourses(1, 5, 'spring', 'Backend & APIs').subscribe();

    const req = httpMock.expectOne(
      (r) =>
        r.url.endsWith('/api/courses') &&
        r.params.get('page') === '1' &&
        r.params.get('size') === '5' &&
        r.params.get('search') === 'spring' &&
        r.params.get('category') === 'Backend & APIs',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ content: [] });
  });

  it('should toggle course publish status via PATCH', () => {
    service.togglePublish(42, true).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url.endsWith('/api/admin/courses/42/publish') && r.params.get('value') === 'true',
    );
    expect(req.request.method).toBe('PATCH');
    req.flush({ message: 'ok' });
  });
});
