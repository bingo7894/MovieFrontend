import { ChangeDetectorRef, Component, ErrorHandler, Inject } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { RATINGS, VIDEO_CATEGORIES } from '../../../shared/constants/app.constants';
import { NotificationService } from '../../../shared/services/notification-service';
import { VideoService } from '../../../shared/services/video-service';
import { MediaService } from '../../../shared/services/media-service';
import { ErrorHandlerService } from '../../../shared/services/error-handler-service';

@Component({
  selector: 'app-manage-video',
  standalone: false,
  templateUrl: './manage-video.html',
  styleUrl: './manage-video.css',
})
export class ManageVideo {
  isSaving = false;
  uploadProgress = 0;
  posterProgress = 0;

  categoriesAll = VIDEO_CATEGORIES;
  rating = RATINGS;
  videoForm: any;

  videoPreviewUrl: string | null = null;
  posterPreviewUrl: string | null = null;
  videoLoading = false;
  posterLoading = false;
  isEditMode: boolean = false;
  error = '';

  constructor(
    private errorHandlerService: ErrorHandlerService,
    private fb: FormBuilder,
    private videoService: VideoService,
    private notification: NotificationService,
    private cdr: ChangeDetectorRef,
    private mediaService: MediaService,
    private dialogRef: MatDialogRef<ManageVideo>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.isEditMode = data.mode === 'edit';
    this.videoForm = this.fb.group({
      title: ['', [Validators.required]],
      description: ['', Validators.required],
      year: [new Date().getFullYear(), Validators.required],
      rating: ['', Validators.required],
      categories: [[] as string[], [Validators.required, ManageVideo.arrayNotEmpty]],
      duration: [0],
      src: ['', Validators.required],
      poster: ['', Validators.required],
      published: [false],
    });
  }

  // 2. เพิ่ม ngOnInit เพื่อดึงข้อมูลเก่ามาใส่ฟอร์ม
  ngOnInit(): void {
    if (this.isEditMode && this.data.video) {
      const v = this.data.video;

      // อัปเดตข้อมูลลงในฟอร์ม
      this.videoForm.patchValue({
        title: v.title,
        description: v.description,
        year: v.year,
        rating: v.rating,
        categories: v.categories,
        duration: v.duration,
        src: v.src,
        poster: v.poster,
        published: v.published,
      });

      // โหลด Preview ภาพและวิดีโอเก่ามาแสดง
      if (v.src) {
        this.videoLoading = true;
        this.loadVideoPreview(v.src);
      }
      if (v.poster) {
        this.posterLoading = true;
        this.loadPosterPreview(v.poster);
      }
    }
  }

  static arrayNotEmpty(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return { required: true };
    }
    return null;
  }

  private loadVideoPreview(value: string | null): void {
    this.videoPreviewUrl = this.mediaService.getMediaUrl(value, 'video');
    this.videoLoading = false;
    this.cdr.detectChanges();
  }

  private loadPosterPreview(value: string | null): void {
    this.posterPreviewUrl = this.mediaService.getMediaUrl(value, 'image');
    this.posterLoading = false;
    this.cdr.detectChanges();
  }

  private extractUuidFromUrl(value: string | undefined | null): string {
    if (!value) return '';

    if (!value.includes('/')) {
      return value;
    }

    const segments = value.split('/');
    return segments[segments.length - 1] || '';
  }

  onVideoPicked(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const validVideoExtensions = [
      '.mp4',
      '.mkv',
      '.avi',
      '.mov',
      '.wmv',
      '.flv',
      '.webm',
      '.m4v',
      '.3gp',
      '.mpeg',
      '.mpg',
      '.ogg',
    ];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validVideoExtensions.some((ext) => fileName.endsWith(ext));
    const hasValidMimeType =
      file.type.startsWith('video/') || file.type === 'application/octet-stream';

    if (!hasValidMimeType && !hasValidExtension) {
      this.notification.error('Please select a valid video file (MP4,MKV,etc.)');
      return;
    }

    const localBlobUrl = URL.createObjectURL(file);
    this.videoPreviewUrl = localBlobUrl;

    this.extractDurationFromFile(file);

    this.uploadProgress = 0;

    this.mediaService.uploadFile(file).subscribe({
      next: ({ progress, uuid }) => {
        this.uploadProgress = progress;
        if (uuid) {
          this.videoForm.patchValue({ src: uuid });
          this.notification.success('Video uploaded successfully');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.notification.error('Failed to upload video, Please try again.');
        this.uploadProgress = 0;
        if (this.videoPreviewUrl === localBlobUrl) {
          URL.revokeObjectURL(localBlobUrl);
          this.videoPreviewUrl = null;
        }
        this.cdr.detectChanges();
      },
    });
  }

  onPosterPicked(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.notification.error('Please select a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.posterPreviewUrl = e.target?.result as string;
      this.cdr.detectChanges();
    };

    reader.readAsDataURL(file);

    this.posterProgress = 0;

    this.mediaService.uploadFile(file).subscribe({
      next: ({ progress, uuid }) => {
        this.posterProgress = progress;
        if (uuid) {
          this.videoForm.patchValue({ poster: uuid });
          this.notification.success('Poster uploaded successfully');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.notification.error('Failed to upload poster, Please try again.');
        this.posterProgress = 0;
        this.posterPreviewUrl = null;

        this.cdr.detectChanges();
      },
    });
  }

  private extractDurationFromFile(file: File) {
    const videoElement = document.createElement('video');
    videoElement.preload = 'metadata';

    const blobUrl = URL.createObjectURL(file);
    videoElement.src = blobUrl;

    videoElement.onloadedmetadata = () => {
      const duration = isFinite(videoElement.duration) ? Math.round(videoElement.duration) : 0;
      this.videoForm.patchValue({ duration: duration });

      URL.revokeObjectURL(blobUrl);
    };

    videoElement.onerror = (e) => {
      console.error('Error loading video for duration extraction', e);
      URL.revokeObjectURL(blobUrl);
    };
  }

  onSave() {
    this.isSaving = true;
    const formData = this.videoForm.value as Partial<any>;

    const op$ = this.isEditMode
      ? this.videoService.updateVideoByAdmin(this.data.video.id, formData)
      : this.videoService.createVideoByAdmin(formData);

    op$.subscribe({
      next: (response: any) => {
        this.isSaving = false;
        this.notification.success(response?.message || 'Video saved successfully.');
        this.cdr.detectChanges();
        this.closeDialog();
      },
      error: (err) => {
        this.isSaving = false;
        this.errorHandlerService.handle(err, 'Faild to save video,Plase try again.');
        this.cdr.detectChanges();
      },
    });
  }

  closeDialog() {
    this.dialogRef.close();
  }

  removeVideo() {
    if (this.videoPreviewUrl && this.videoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.videoPreviewUrl);
    }
    this.videoPreviewUrl = null;
    this.videoForm.patchValue({ src: '', duration: 0 });
    this.uploadProgress = 0;
  }

  removePoster() {
    if (this.posterPreviewUrl && this.posterPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.posterPreviewUrl);
    }
    this.posterPreviewUrl = null;
    this.videoForm.patchValue({ poster: '' });
    this.posterProgress = 0;
  }
}
