import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient, HttpEventType, HttpRequest } from '@angular/common/http';
import { AuthService } from './auth-service';
import { map, Observable } from 'rxjs';

export interface UploadResult {
  progress: number;
  uuid?: string;
  filename?: string;
  size?: number;
  contentType?: string;
}

@Injectable({
  providedIn: 'root',
})
export class MediaService {
  private apiUrl = environment.apiUrl + '/files';
  private imageCache = new Map<string, string>();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  uploadFile(file: File, kind?: 'video' | 'image' | 'material'): Observable<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);

    const resolvedKind =
      kind || (file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : 'material');
    const uploadUrl = `${this.apiUrl}/upload/${resolvedKind}`;

    const req = new HttpRequest('POST', uploadUrl, formData, {
      reportProgress: true,
    });

    return this.http.request(req).pipe(
      map((event) => {
        if (event.type === HttpEventType.UploadProgress) {
          const progress = Math.round((100 * event.loaded) / (event.total || 1));
          return { progress };
        } else if (event.type === HttpEventType.Response) {
          const body = event.body as any;
          return {
            progress: 100,
            uuid: body?.uuid || '',
            filename: body?.filename || file.name,
            size: Number(body?.size || file.size),
            contentType: body?.contentType || file.type,
          };
        }
        return { progress: 0 };
      }),
    );
  }

  getMediaUrl(
    mediaValue: any,
    type: 'image' | 'video',
    options?: {
      useCache?: boolean;
    },
  ): string | null {
    let value = mediaValue;

    if (type === 'image' && mediaValue && typeof mediaValue === 'object') {
      value = mediaValue.thumbnail || mediaValue.thumbnailUuid || mediaValue.poster;
    }

    if (!value) {
      return null;
    }

    let uuid = value;
    if (typeof value === 'string' && value.includes(`/${type}/`)) {
      uuid = value.substring(value.lastIndexOf('/') + 1).split('?')[0];
    }

    if (typeof uuid === 'string' && (uuid.startsWith('blob:') || uuid.startsWith('data:'))) {
      return uuid;
    }

    if (options?.useCache && type === 'image' && this.imageCache.has(uuid)) {
      return this.imageCache.get(uuid)!;
    }

    const token = this.authService.getToken();
    if (!token) {
      return null;
    }

    const authenticatedUrl = `${this.apiUrl}/${type}/${uuid}?token=${encodeURIComponent(token)}`;

    if (options?.useCache && type === 'image') {
      this.imageCache.set(uuid, authenticatedUrl);
    }

    return authenticatedUrl;
  }

  getMaterialUrl(fileUuid: string, filename?: string, download: boolean = false): string | null {
    const token = this.authService.getToken();
    if (!token || !fileUuid) {
      return null;
    }
    const params = new URLSearchParams();
    if (filename) params.set('filename', filename);
    if (download) params.set('download', 'true');
    params.set('token', token);
    return `${this.apiUrl}/material/${fileUuid}?${params.toString()}`;
  }
}
