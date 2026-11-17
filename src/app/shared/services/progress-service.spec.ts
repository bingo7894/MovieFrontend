import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProgressService } from './progress-service';

describe('ProgressService', () => {
  let service: ProgressService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProgressService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should update episode progress', () => {
    service.updateEpisodeProgress(7, { watchedSeconds: 120, completed: true }).subscribe();

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/progress/episodes/7'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ watchedSeconds: 120, completed: true });
    req.flush({ episodeId: 7, watchedSeconds: 120, completed: true });
  });
});
