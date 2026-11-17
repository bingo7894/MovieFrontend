import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { QuizService } from './quiz-service';

describe('QuizService', () => {
  let service: QuizService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(QuizService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should submit quiz answers payload', () => {
    service.submitQuiz(10, { 1: [11], 2: [21, 22] }).subscribe();

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/quizzes/10/submit'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ answers: { 1: [11], 2: [21, 22] } });
    req.flush({ scorePercent: 100, passed: true });
  });
});
