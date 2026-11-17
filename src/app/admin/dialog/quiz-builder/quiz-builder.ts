import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { QuizService } from '../../../shared/services/quiz-service';
import { NotificationService } from '../../../shared/services/notification-service';
import { ErrorHandlerService } from '../../../shared/services/error-handler-service';

@Component({
  selector: 'app-quiz-builder',
  standalone: false,
  templateUrl: './quiz-builder.html',
  styleUrl: './quiz-builder.css',
})
export class QuizBuilder implements OnInit {
  quizForm!: FormGroup;
  isEditMode = false;
  loading = false;
  isSaving = false;

  constructor(
    private fb: FormBuilder,
    private quizService: QuizService,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<QuizBuilder>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.isEditMode = !!data?.quizId;
    this.quizForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      passingScore: [70, [Validators.required, Validators.min(0), Validators.max(100)]],
      published: [true],
      questions: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    if (this.isEditMode) {
      this.loading = true;
      this.quizService.getAdminQuiz(this.data.quizId).subscribe({
        next: (quiz: any) => {
          this.quizForm.patchValue({
            title: quiz.title,
            description: quiz.description || '',
            passingScore: quiz.passingScore ?? 70,
            published: quiz.published !== false,
          });
          this.questions.clear();
          (quiz.questions || []).forEach((q: any) => this.addQuestion(q));
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loading = false;
          this.errorHandler.handle(err, 'Failed to load quiz');
          this.cdr.detectChanges();
        },
      });
    } else {
      this.addQuestion();
    }
  }

  get questions(): FormArray {
    return this.quizForm.get('questions') as FormArray;
  }

  getOptions(questionIndex: number): FormArray {
    return this.questions.at(questionIndex).get('options') as FormArray;
  }

  addQuestion(existing?: any): void {
    const qGroup = this.fb.group({
      questionText: [existing?.questionText || '', Validators.required],
      questionType: [existing?.questionType || 'MULTIPLE_CHOICE', Validators.required],
      explanation: [existing?.explanation || ''],
      options: this.fb.array([]),
    });

    const optsArray = qGroup.get('options') as FormArray;
    if (existing?.options?.length) {
      existing.options.forEach((opt: any) => {
        optsArray.push(
          this.fb.group({
            optionText: [opt.optionText, Validators.required],
            correct: [!!opt.correct],
          }),
        );
      });
    } else {
      optsArray.push(this.fb.group({ optionText: ['', Validators.required], correct: [true] }));
      optsArray.push(this.fb.group({ optionText: ['', Validators.required], correct: [false] }));
    }

    this.questions.push(qGroup);
  }

  removeQuestion(index: number): void {
    if (this.questions.length <= 1) return;
    this.questions.removeAt(index);
  }

  addOption(questionIndex: number): void {
    this.getOptions(questionIndex).push(
      this.fb.group({ optionText: ['', Validators.required], correct: [false] }),
    );
  }

  removeOption(questionIndex: number, optionIndex: number): void {
    const opts = this.getOptions(questionIndex);
    if (opts.length <= 2) return;
    opts.removeAt(optionIndex);
  }

  onTypeChange(questionIndex: number, newType: string): void {
    if (newType === 'TRUE_FALSE') {
      const opts = this.getOptions(questionIndex);
      opts.clear();
      opts.push(this.fb.group({ optionText: ['True', Validators.required], correct: [true] }));
      opts.push(this.fb.group({ optionText: ['False', Validators.required], correct: [false] }));
    }
  }

  onSave(): void {
    if (this.quizForm.invalid) return;

    const raw = this.quizForm.value;
    const hasMissingCorrect = raw.questions.some(
      (q: any) => !q.options.some((opt: any) => opt.correct),
    );
    if (hasMissingCorrect) {
      this.notification.error('Each question must have at least one correct option checked');
      return;
    }

    const payload = {
      ...raw,
      questions: raw.questions.map((q: any, idx: number) => ({
        ...q,
        sortOrder: idx + 1,
      })),
    };

    this.isSaving = true;
    const op$ = this.isEditMode
      ? this.quizService.updateQuiz(this.data.quizId, payload)
      : this.quizService.createQuiz(this.data.episodeId, payload);

    op$.subscribe({
      next: (saved) => {
        this.isSaving = false;
        this.notification.success(this.isEditMode ? 'Quiz updated' : 'Quiz created');
        this.dialogRef.close(saved);
      },
      error: (err) => {
        this.isSaving = false;
        this.errorHandler.handle(err, 'Failed to save quiz');
        this.cdr.detectChanges();
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
