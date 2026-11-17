import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CurriculumService } from '../../../shared/services/curriculum-service';
import { MediaService } from '../../../shared/services/media-service';
import { NotificationService } from '../../../shared/services/notification-service';
import { ErrorHandlerService } from '../../../shared/services/error-handler-service';

@Component({
  selector: 'app-manage-episode',
  standalone: false,
  templateUrl: './manage-episode.html',
  styleUrl: './manage-episode.css',
})
export class ManageEpisode implements OnInit {
  episodeForm!: FormGroup;
  isEditMode = false;
  isSaving = false;
  uploadProgress = 0;
  videoPreviewUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private curriculumService: CurriculumService,
    private mediaService: MediaService,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService,
    private cdr: ChangeDetectorRef,
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

  onVideoPicked(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const validExts = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.mpeg', '.mpg', '.ogg'];
    const nameLower = file.name.toLowerCase();
    const valid = file.type.startsWith('video/') || validExts.some((e) => nameLower.endsWith(e));
    if (!valid) {
      this.notification.error('Please select a valid video file');
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    this.videoPreviewUrl = blobUrl;
    this.extractDuration(file);

    this.uploadProgress = 0;
    this.mediaService.uploadFile(file, 'video').subscribe({
      next: ({ progress, uuid }) => {
        this.uploadProgress = progress;
        if (uuid) {
          this.episodeForm.patchValue({ videoUuid: uuid });
          this.notification.success('Episode video uploaded');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.uploadProgress = 0;
        if (this.videoPreviewUrl === blobUrl) {
          URL.revokeObjectURL(blobUrl);
          this.videoPreviewUrl = null;
        }
        this.errorHandler.handle(err, 'Failed to upload video');
        this.cdr.detectChanges();
      },
    });
  }

  private extractDuration(file: File): void {
    const videoEl = document.createElement('video');
    videoEl.preload = 'metadata';
    const url = URL.createObjectURL(file);
    videoEl.src = url;
    videoEl.onloadedmetadata = () => {
      const duration = isFinite(videoEl.duration) ? Math.round(videoEl.duration) : 0;
      this.episodeForm.patchValue({ duration });
      URL.revokeObjectURL(url);
      this.cdr.detectChanges();
    };
    videoEl.onerror = () => URL.revokeObjectURL(url);
  }

  removeVideo(): void {
    if (this.videoPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.videoPreviewUrl);
    }
    this.videoPreviewUrl = null;
    this.episodeForm.patchValue({ videoUuid: '', duration: 0 });
    this.uploadProgress = 0;
  }

  onSave(): void {
    if (this.episodeForm.invalid) return;
    this.isSaving = true;
    const payload = this.episodeForm.value;

    const op$ = this.isEditMode
      ? this.curriculumService.updateEpisode(this.data.episode.id, payload)
      : this.curriculumService.createEpisode(this.data.topicId, payload);

    op$.subscribe({
      next: (saved) => {
        this.isSaving = false;
        this.notification.success(this.isEditMode ? 'Episode updated' : 'Episode created');
        this.dialogRef.close(saved);
      },
      error: (err) => {
        this.isSaving = false;
        this.errorHandler.handle(err, 'Failed to save episode');
        this.cdr.detectChanges();
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
