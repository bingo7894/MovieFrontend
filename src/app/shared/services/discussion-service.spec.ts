import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DiscussionService } from './discussion-service';

describe('DiscussionService', () => {
  let service: DiscussionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DiscussionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should post questions and replies on episode discussions', () => {
    service.createDiscussion(9, { title: 'Help', content: 'Details', videoTimestamp: 45 }).subscribe();
    const postReq = httpMock.expectOne((r) => r.url.endsWith('/api/episodes/9/discussions'));
    expect(postReq.request.method).toBe('POST');
    postReq.flush({ id: 1 });

    service.addReply(1, 'Answer').subscribe();
    const replyReq = httpMock.expectOne((r) => r.url.endsWith('/api/discussions/1/replies'));
    expect(replyReq.request.method).toBe('POST');
    replyReq.flush({ id: 1 });
  });
});
