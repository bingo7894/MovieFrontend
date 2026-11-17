import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CurriculumService } from '../../../shared/services/curriculum-service';
import { NotificationService } from '../../../shared/services/notification-service';
import { ErrorHandlerService } from '../../../shared/services/error-handler-service';

@Component({
  selector: 'app-manage-topic',
  standalone: false,
  templateUrl: './manage-topic.html',
  styleUrl: './manage-topic.css',
})
export class ManageTopic implements OnInit {
  topicForm!: FormGroup;
  isEditMode = false;
  isSaving = false;

  constructor(
    private fb: FormBuilder,
    private curriculumService: CurriculumService,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<ManageTopic>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.isEditMode = data?.mode === 'edit';
    this.topicForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      sortOrder: [data?.nextOrder || 1, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit(): void {
    if (this.isEditMode && this.data?.topic) {
      this.topicForm.patchValue({
        title: this.data.topic.title || '',
        description: this.data.topic.description || '',
        sortOrder: this.data.topic.sortOrder ?? 1,
      });
    }
  }

  onSave(): void {
    if (this.topicForm.invalid) return;
    this.isSaving = true;
    const payload = this.topicForm.value;

    const op$ = this.isEditMode
      ? this.curriculumService.updateTopic(this.data.topic.id, payload)
      : this.curriculumService.createTopic(this.data.courseId, payload);

    op$.subscribe({
      next: (saved) => {
        this.isSaving = false;
        this.notification.success(this.isEditMode ? 'Topic updated' : 'Topic created');
        this.dialogRef.close(saved);
      },
      error: (err) => {
        this.isSaving = false;
        this.errorHandler.handle(err, 'Failed to save topic');
        this.cdr.detectChanges();
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
