import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient, HttpEventType, HttpRequest } from '@angular/common/http';
import { AuthService } from './auth-service';
import { every, map, Observable, startWith } from 'rxjs';

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

  uploadFile(file: File): Observable<{ progress: number; uuid?: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const isVideo = file.type.startsWith('video/');
    const uploadUrl = isVideo ? `${this.apiUrl}/upload/video` : `${this.apiUrl}/upload/image`;

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
          return { progress: 100, uuid: body?.uuid || '' };
        }
        return { progress: 0 };
      }),
    );
  }

  getMediaUrl(
    mediaValue: any,
    type: 'image' | 'video',
    options?: {
      userCache?: boolean;
    },
  ): string | null {
    let value = mediaValue;

    // ถ้าต้องการโหลดรูป (image) แต่มันเป็น Object ที่มีรูปหน้าปก (poster) ให้ดึง poster มาใช้
    if (type === 'image' && mediaValue && typeof mediaValue === 'object' && mediaValue.poster) {
      value = mediaValue.poster;
    }

    if (!value) {
      return null;
    }

    let uuid = value;
    // ถ้าค่าที่ส่งมาเป็น URL ยาวๆ ให้ตัดเอามาเฉพาะ UUID ตัวสุดท้าย
    if (typeof value === 'string' && value.includes(`/${type}`)) {
      uuid = value.substring(value.lastIndexOf('/') + 1);
    }

    // ระบบ Cache: ถ้าเราเคยโหลดรูปนี้มาแล้ว (และอนุญาตให้ใช้ Cache) ให้ดึงของเดิมมาใช้เลย
    if (options?.userCache && type === 'image' && this.imageCache.has(uuid)) {
      return this.imageCache.get(uuid)!;
    }

    // ถ้าเป็นไฟล์รูปภาพที่เพิ่งอัปโหลดสดๆ จากเครื่อง (ยังไม่ส่งขึ้นเซิร์ฟเวอร์) ให้ใช้ URL นั้นเลย
    if (typeof uuid === 'string' && (uuid.startsWith('blob:') || uuid.startsWith('data:'))) {
      return uuid;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.log(`No token found for ${type} loading`);
      return null;
    }

    const authenticatedUrl = `${this.apiUrl}/${type}/${uuid}?token=${encodeURIComponent(token)}`;

    if (options?.userCache && type === 'image') {
      this.imageCache.set(uuid, authenticatedUrl);
    }

    return authenticatedUrl;
  }
}
