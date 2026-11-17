import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseService } from '../../shared/services/course-service';
import { MediaService } from '../../shared/services/media-service';
import { ProgressService } from '../../shared/services/progress-service';
import { QuizService } from '../../shared/services/quiz-service';
import { UtilityService } from '../../shared/services/utility-service';
import { NotificationService } from '../../shared/services/notification-service';
import { ErrorHandlerService } from '../../shared/services/error-handler-service';

@Component({
  selector: 'app-course-player',
  standalone: false,
  templateUrl: './course-player.html',
  styleUrl: './course-player.css',
})
export class CoursePlayer implements OnInit, OnDestroy {
  @ViewChild('lessonVideo') videoRef?: ElementRef<HTMLVideoElement>;

  courseId!: number;
  course: any = null;
  currentTopic: any = null;
  currentEpisode: any = null;
  flatEpisodes: { topic: any; episode: any }[] = [];

  loading = true;
  videoUrl: string | null = null;
  currentVideoTime = 0;
  private lastSavedSecond = 0;
  private resumedInitialSeek = false;

  // Materials / Notes
  notes: any[] = [];
  newNoteText = '';
  savingNote = false;

  // Quiz runner state
  activeQuiz: any = null;
  quizLoading = false;
  submittingQuiz = false;
  selectedAnswers: Record<number, number[]> = {};
  quizResult: any = null;
  quizAttempts: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private mediaService: MediaService,
    private progressService: ProgressService,
    private quizService: QuizService,
    public utilityService: UtilityService,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.courseId = Number(this.route.snapshot.paramMap.get('courseId'));
    this.loadCourse();
  }

  ngOnDestroy(): void {
    this.flushVideoProgress(false);
  }

  loadCourse(preserveEpisodeId?: number): void {
    this.loading = true;
    const requestedEpId =
      preserveEpisodeId || Number(this.route.snapshot.queryParamMap.get('ep')) || undefined;

    this.courseService.getCourseDetail(this.courseId).subscribe({
      next: (course: any) => {
        this.course = course;
        this.flatEpisodes = [];
        for (const topic of course.topics || []) {
          for (const ep of topic.episodes || []) {
            this.flatEpisodes.push({ topic, episode: ep });
          }
        }

        if (this.flatEpisodes.length > 0) {
          const target =
            (requestedEpId && this.flatEpisodes.find((item) => item.episode.id === requestedEpId)) ||
            this.flatEpisodes.find((item) => !item.episode.completed) ||
            this.flatEpisodes[0];
          this.selectEpisode(target.topic, target.episode, false);
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.errorHandler.handle(err, 'Failed to load course');
        this.cdr.detectChanges();
      },
    });
  }

  selectEpisode(topic: any, episode: any, savePrevious: boolean = true): void {
    if (savePrevious && this.currentEpisode && this.currentEpisode.id !== episode.id) {
      this.flushVideoProgress(false);
    }

    this.currentTopic = topic;
    this.currentEpisode = episode;
    this.currentVideoTime = episode.watchedSeconds || 0;
    this.lastSavedSecond = this.currentVideoTime;
    this.resumedInitialSeek = false;
    this.videoUrl = episode.videoUuid
      ? this.mediaService.getMediaUrl(episode.videoUuid, 'video')
      : null;

    // Reset quiz state
    this.activeQuiz = null;
    this.quizResult = null;
    this.selectedAnswers = {};
    this.quizAttempts = [];

    // Load notes for this episode
    this.loadNotes(episode.id);

    // Sync query param cleanly
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ep: episode.id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.cdr.detectChanges();
  }

  onVideoLoadedMetadata(): void {
    const el = this.videoRef?.nativeElement;
    if (!el || this.resumedInitialSeek || !this.currentEpisode) return;
    this.resumedInitialSeek = true;
    const saved = this.currentEpisode.watchedSeconds || 0;
    if (saved > 2 && el.duration && saved < el.duration - 3) {
      el.currentTime = saved;
    }
  }

  onVideoTimeUpdate(): void {
    const el = this.videoRef?.nativeElement;
    if (!el) return;
    const sec = Math.floor(el.currentTime || 0);
    this.currentVideoTime = sec;
    if (Math.abs(sec - this.lastSavedSecond) >= 10) {
      this.flushVideoProgress(false);
    }
  }

  onVideoEnded(): void {
    this.flushVideoProgress(true);
  }

  flushVideoProgress(markComplete: boolean): void {
    if (!this.currentEpisode) return;
    const ep = this.currentEpisode;
    const watchedSeconds = this.videoRef?.nativeElement
      ? Math.floor(this.videoRef.nativeElement.currentTime || this.currentVideoTime || 0)
      : this.currentVideoTime;

    this.lastSavedSecond = watchedSeconds;
    const payload: { watchedSeconds?: number; completed?: boolean } = { watchedSeconds };
    if (markComplete) payload.completed = true;

    this.progressService.updateEpisodeProgress(ep.id, payload).subscribe({
      next: (res: any) => {
        ep.watchedSeconds = res.watchedSeconds;
        if (res.completed && !ep.completed) {
          ep.completed = true;
          this.recalculateCourseProgress();
        }
        this.cdr.detectChanges();
      },
    });
  }

  toggleComplete(): void {
    if (!this.currentEpisode) return;
    const nextState = !this.currentEpisode.completed;
    this.progressService
      .updateEpisodeProgress(this.currentEpisode.id, {
        watchedSeconds: this.currentVideoTime,
        completed: nextState,
      })
      .subscribe({
        next: (res: any) => {
          this.currentEpisode.completed = res.completed;
          this.recalculateCourseProgress();
          this.notification.success(res.completed ? 'Marked episode as completed' : 'Marked as incomplete');
          this.cdr.detectChanges();
        },
        error: (err) => this.errorHandler.handle(err, 'Failed to update progress'),
      });
  }

  private recalculateCourseProgress(): void {
    if (!this.course) return;
    let total = 0;
    let completed = 0;
    for (const topic of this.course.topics || []) {
      let topicCompleted = 0;
      for (const ep of topic.episodes || []) {
        total++;
        if (ep.completed) {
          completed++;
          topicCompleted++;
        }
      }
      topic.completedEpisodes = topicCompleted;
    }
    this.course.completedEpisodes = completed;
    this.course.episodeCount = total;
    this.course.progressPercent = total > 0 ? Math.round((completed * 100) / total) : 0;
  }

  get currentEpisodeIndex(): number {
    if (!this.currentEpisode) return -1;
    return this.flatEpisodes.findIndex((i) => i.episode.id === this.currentEpisode.id);
  }

  goPreviousEpisode(): void {
    const idx = this.currentEpisodeIndex;
    if (idx > 0) {
      const prev = this.flatEpisodes[idx - 1];
      this.selectEpisode(prev.topic, prev.episode);
    }
  }

  goNextEpisode(): void {
    const idx = this.currentEpisodeIndex;
    if (idx >= 0 && idx < this.flatEpisodes.length - 1) {
      const next = this.flatEpisodes[idx + 1];
      this.selectEpisode(next.topic, next.episode);
    }
  }

  toggleEnrollment(): void {
    if (!this.course) return;
    const op$ = this.course.enrolled
      ? this.progressService.unenrollCourse(this.course.id)
      : this.progressService.enrollCourse(this.course.id);

    op$.subscribe({
      next: () => {
        this.course.enrolled = !this.course.enrolled;
        this.notification.success(
          this.course.enrolled ? 'Saved to My Learning' : 'Removed from My Learning',
        );
        this.cdr.detectChanges();
      },
      error: (err) => this.errorHandler.handle(err, 'Failed to update enrollment'),
    });
  }

  openMaterial(att: any, download: boolean): void {
    const url = this.mediaService.getMaterialUrl(att.fileUuid, att.originalFilename, download);
    if (url) window.open(url, '_blank');
  }

  // ===== Quiz Runner =====
  startQuiz(quizSummary: any): void {
    this.quizLoading = true;
    this.quizResult = null;
    this.selectedAnswers = {};

    this.quizService.getQuiz(quizSummary.id).subscribe({
      next: (quiz: any) => {
        this.activeQuiz = quiz;
        this.quizLoading = false;
        this.loadQuizAttempts(quiz.id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.quizLoading = false;
        this.errorHandler.handle(err, 'Failed to load quiz');
        this.cdr.detectChanges();
      },
    });
  }

  loadQuizAttempts(quizId: number): void {
    this.quizService.getAttempts(quizId).subscribe({
      next: (attempts: any) => {
        this.quizAttempts = attempts || [];
        this.cdr.detectChanges();
      },
    });
  }

  isOptionSelected(questionId: number, optionId: number): boolean {
    return (this.selectedAnswers[questionId] || []).includes(optionId);
  }

  selectSingleOption(questionId: number, optionId: number): void {
    this.selectedAnswers[questionId] = [optionId];
  }

  toggleMultiOption(questionId: number, optionId: number, checked: boolean): void {
    const current = new Set(this.selectedAnswers[questionId] || []);
    if (checked) {
      current.add(optionId);
    } else {
      current.delete(optionId);
    }
    this.selectedAnswers[questionId] = Array.from(current);
  }

  submitQuiz(): void {
    if (!this.activeQuiz) return;
    this.submittingQuiz = true;
    this.quizService.submitQuiz(this.activeQuiz.id, this.selectedAnswers).subscribe({
      next: (result: any) => {
        this.submittingQuiz = false;
        this.quizResult = result;
        this.loadQuizAttempts(this.activeQuiz.id);

        // Update quiz summary on currentEpisode
        const summary = (this.currentEpisode?.quizzes || []).find((q: any) => q.id === this.activeQuiz.id);
        if (summary) {
          summary.bestScore = Math.max(summary.bestScore || 0, result.scorePercent);
          summary.passed = summary.passed || result.passed;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.submittingQuiz = false;
        this.errorHandler.handle(err, 'Failed to submit quiz');
        this.cdr.detectChanges();
      },
    });
  }

  // ===== Notes =====
  loadNotes(episodeId: number): void {
    this.progressService.getNotes(episodeId).subscribe({
      next: (notes: any) => {
        this.notes = notes || [];
        this.cdr.detectChanges();
      },
    });
  }

  addNote(): void {
    if (!this.currentEpisode || !this.newNoteText.trim()) return;
    this.savingNote = true;
    const timestampSeconds = this.videoRef?.nativeElement
      ? Math.floor(this.videoRef.nativeElement.currentTime || 0)
      : this.currentVideoTime;

    this.progressService
      .createNote(this.currentEpisode.id, {
        timestampSeconds,
        content: this.newNoteText.trim(),
      })
      .subscribe({
        next: (note) => {
          this.savingNote = false;
          this.newNoteText = '';
          this.notes = [...this.notes, note].sort((a, b) => a.timestampSeconds - b.timestampSeconds);
          this.notification.success('Note saved');
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.savingNote = false;
          this.errorHandler.handle(err, 'Failed to save note');
          this.cdr.detectChanges();
        },
      });
  }

  seekToNote(seconds: number): void {
    const el = this.videoRef?.nativeElement;
    if (!el) return;
    el.currentTime = seconds;
    el.play().catch(() => {});
  }

  deleteNote(noteId: number): void {
    this.progressService.deleteNote(noteId).subscribe({
      next: () => {
        this.notes = this.notes.filter((n) => n.id !== noteId);
        this.cdr.detectChanges();
      },
      error: (err) => this.errorHandler.handle(err, 'Failed to delete note'),
    });
  }

  backToCatalog(): void {
    this.router.navigate(['/home']);
  }
}
