import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { COURSE_CATEGORIES, COURSE_LEVELS } from '../../../shared/constants/app.constants';
import { CourseService } from '../../../shared/services/course-service';
import { MediaService } from '../../../shared/services/media-service';
import { NotificationService } from '../../../shared/services/notification-service';
import { ErrorHandlerService } from '../../../shared/services/error-handler-service';

@Component({
  selector: 'app-manage-course',
  standalone: false,
  templateUrl: './manage-course.html',
  styleUrl: './manage-course.css',
})
export class ManageCourse implements OnInit {
  courseForm!: FormGroup;
  isEditMode = false;
  isSaving = false;
  uploadProgress = 0;
  thumbnailPreviewUrl: string | null = null;
  categories = COURSE_CATEGORIES;
  levels = COURSE_LEVELS;

  constructor(
    private fb: FormBuilder,
    private courseService: CourseService,
    private mediaService: MediaService,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<ManageCourse>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.isEditMode = data?.mode === 'edit';
    this.courseForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      category: ['Programming', Validators.required],
      level: ['BEGINNER', Validators.required],
      thumbnailUuid: [''],
      published: [false],
    });
  }

  ngOnInit(): void {
    if (this.isEditMode && this.data?.course) {
      const c = this.data.course;
      this.courseForm.patchValue({
        title: c.title || '',
        description: c.description || '',
        category: c.category || 'Programming',
        level: c.level || 'BEGINNER',
        thumbnailUuid: c.thumbnailUuid || '',
        published: !!c.published,
      });
      if (c.thumbnailUuid || c.thumbnail) {
        this.thumbnailPreviewUrl = this.mediaService.getMediaUrl(c, 'image');
      }
    }
  }

  onThumbnailPicked(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.notification.error('Please select a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.thumbnailPreviewUrl = e.target?.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);

    this.uploadProgress = 0;
    this.mediaService.uploadFile(file, 'image').subscribe({
      next: ({ progress, uuid }) => {
        this.uploadProgress = progress;
        if (uuid) {
          this.courseForm.patchValue({ thumbnailUuid: uuid });
          this.notification.success('Thumbnail uploaded successfully');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.uploadProgress = 0;
        this.errorHandler.handle(err, 'Failed to upload thumbnail');
        this.cdr.detectChanges();
      },
    });
  }

  removeThumbnail(): void {
    this.thumbnailPreviewUrl = null;
    this.courseForm.patchValue({ thumbnailUuid: '' });
    this.uploadProgress = 0;
  }

  onSave(): void {
    if (this.courseForm.invalid) return;
    this.isSaving = true;
    const payload = this.courseForm.value;

    const op$ = this.isEditMode
      ? this.courseService.updateCourse(this.data.course.id, payload)
      : this.courseService.createCourse(payload);

    op$.subscribe({
      next: (saved) => {
        this.isSaving = false;
        this.notification.success(this.isEditMode ? 'Course updated successfully' : 'Course created successfully');
        this.dialogRef.close(saved);
      },
      error: (err) => {
        this.isSaving = false;
        this.errorHandler.handle(err, 'Failed to save course');
        this.cdr.detectChanges();
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
