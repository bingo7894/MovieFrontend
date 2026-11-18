import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CertificateService } from './certificate-service';

describe('CertificateService', () => {
  let service: CertificateService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CertificateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should claim a course certificate via POST and verify a code via GET', () => {
    service.issueOrGetCertificate(7).subscribe();
    const issueReq = httpMock.expectOne((r) => r.url.endsWith('/api/courses/7/certificate'));
    expect(issueReq.request.method).toBe('POST');
    issueReq.flush({ certificateCode: 'PL-1234ABCD' });

    service.verifyCertificate(' PL-1234ABCD ').subscribe();
    const verifyReq = httpMock.expectOne((r) => r.url.endsWith('/api/certificates/verify/PL-1234ABCD'));
    expect(verifyReq.request.method).toBe('GET');
    verifyReq.flush({ valid: true });
  });
});
