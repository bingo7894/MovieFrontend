import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { finalize, Subscription } from 'rxjs';
import { CurriculumService } from '../../../shared/services/curriculum-service';
import { MediaService } from '../../../shared/services/media-service';
import { NotificationService } from '../../../shared/services/notification-service';
import { ErrorHandlerService } from '../../../shared/services/error-handler-service';
import { UtilityService } from '../../../shared/services/utility-service';

@Component({
  selector: 'app-manage-episode',
  standalone: false,
  templateUrl: './manage-episode.html',
  styleUrl: './manage-episode.css',
})
export class ManageEpisode implements OnInit, OnDestroy {
  episodeForm!: FormGroup;
  isEditMode = false;
  isSaving = false;
  isUploading = false;
  uploadProgress = 0;
  videoPreviewUrl: string | null = null;
  private uploadSub: Subscription | null = null;

  constructor(
    private fb: FormBuilder,
    private curriculumService: CurriculumService,
    private mediaService: MediaService,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService,
    public utilityService: UtilityService,
    public dialogRef: MatDialogRef<ManageEpisode>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.isEditMode = data?.mode === 'edit';
    this.episodeForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      episodeNumber: [data?.nextEpisodeNumber || 1, [Validators.required, Validators.min(1)]],
      videoUuid: [''],
      duration: [0, [Validators.min(0)]],
      freePreview: [false],
      published: [true],
    });
  }

  ngOnInit(): void {
    if (this.isEditMode && this.data?.episode) {
      const ep = this.data.episode;
      this.episodeForm.patchValue({
        title: ep.title || '',
        description: ep.description || '',
        episodeNumber: ep.episodeNumber ?? 1,
        videoUuid: ep.videoUuid || '',
        duration: ep.duration ?? 0,
        freePreview: !!ep.freePreview,
        published: ep.published !== false,
      });
      if (ep.videoUuid || ep.videoUrl) {
        this.videoPreviewUrl = this.mediaService.getMediaUrl(ep.videoUuid || ep.videoUrl, 'video');
      }
    }
  }

  ngOnDestroy(): void {
    this.uploadSub?.unsubscribe();
    if (this.videoPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.videoPreviewUrl);
    }
  }

  onVideoPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const validExts = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.mpeg', '.mpg', '.ogg'];
    const nameLower = file.name.toLowerCase();
    const valid = file.type.startsWith('video/') || validExts.some((e) => nameLower.endsWith(e));
    if (!valid) {
      this.notification.error('Please select a valid video file');
      return;
    }

    if (this.videoPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.videoPreviewUrl);
    }

    const blobUrl = URL.createObjectURL(file);
    this.videoPreviewUrl = blobUrl;
    this.episodeForm.patchValue({ duration: 0 });
    this.extractDuration(file, blobUrl);

    this.uploadSub?.unsubscribe();
    this.uploadProgress = 0;
    this.isUploading = true;
    this.uploadSub = this.mediaService
      .uploadFile(file, 'video')
      .pipe(finalize(() => (this.isUploading = false)))
      .subscribe({
        next: ({ progress, uuid }) => {
          this.uploadProgress = progress;
          if (uuid) {
            this.episodeForm.patchValue({ videoUuid: uuid });
            this.notification.success('Episode video uploaded');
          }
        },
        error: (err) => {
          this.uploadProgress = 0;
          if (this.videoPreviewUrl === blobUrl) {
            URL.revokeObjectURL(blobUrl);
            this.videoPreviewUrl = null;
          }
          this.errorHandler.handle(err, 'Failed to upload video');
        },
      });
  }

  onVideoMetadataLoaded(event: Event): void {
    const videoEl = event.target as HTMLVideoElement;
    if (videoEl && isFinite(videoEl.duration) && videoEl.duration > 0) {
      const detected = Math.round(videoEl.duration);
      if (detected > 0 && (this.episodeForm.value.duration ?? 0) !== detected) {
        this.episodeForm.patchValue({ duration: detected });
      }
    }
  }

  private extractDuration(file: File, expectedBlobUrl: string): void {
    const videoEl = document.createElement('video');
    videoEl.preload = 'metadata';
    const url = URL.createObjectURL(file);
    videoEl.src = url;
    videoEl.onloadedmetadata = () => {
      if (this.videoPreviewUrl === expectedBlobUrl && isFinite(videoEl.duration)) {
        const duration = Math.round(videoEl.duration);
        this.episodeForm.patchValue({ duration });
      }
      URL.revokeObjectURL(url);
    };
    videoEl.onerror = () => URL.revokeObjectURL(url);
  }

  removeVideo(): void {
    this.uploadSub?.unsubscribe();
    if (this.videoPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.videoPreviewUrl);
    }
    this.videoPreviewUrl = null;
    this.episodeForm.patchValue({ videoUuid: '', duration: 0 });
    this.uploadProgress = 0;
    this.isUploading = false;
  }

  onSave(): void {
    if (this.isSaving || this.isUploading || this.episodeForm.invalid) return;
    this.isSaving = true;
    const payload = this.episodeForm.value;

    const op$ = this.isEditMode
      ? this.curriculumService.updateEpisode(this.data.episode.id, payload)
      : this.curriculumService.createEpisode(this.data.topicId, payload);

    op$.pipe(finalize(() => (this.isSaving = false))).subscribe({
      next: (saved) => {
        this.notification.success(this.isEditMode ? 'Episode updated' : 'Episode created');
        this.dialogRef.close(saved);
      },
      error: (err) => {
        this.errorHandler.handle(err, 'Failed to save episode');
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
