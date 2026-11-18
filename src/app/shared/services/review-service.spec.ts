import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReviewService } from './review-service';

describe('ReviewService', () => {
  let service: ReviewService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReviewService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should fetch and upsert course reviews', () => {
    service.getCourseReviews(5).subscribe();
    const getReq = httpMock.expectOne((r) => r.url.endsWith('/api/courses/5/reviews'));
    expect(getReq.request.method).toBe('GET');
    getReq.flush({ averageRating: 4.5, reviewCount: 2, reviews: [] });

    service.upsertReview(5, { rating: 5, comment: 'Great!' }).subscribe();
    const postReq = httpMock.expectOne((r) => r.url.endsWith('/api/courses/5/reviews'));
    expect(postReq.request.method).toBe('POST');
    postReq.flush({ id: 10 });
  });
});
