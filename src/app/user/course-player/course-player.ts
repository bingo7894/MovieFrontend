import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { CourseService } from '../../shared/services/course-service';
import { MediaService } from '../../shared/services/media-service';
import { ProgressService } from '../../shared/services/progress-service';
import { QuizService } from '../../shared/services/quiz-service';
import { DiscussionService } from '../../shared/services/discussion-service';
import { CertificateService } from '../../shared/services/certificate-service';
import { DialogService } from '../../shared/services/dialog-service';
import { AuthService } from '../../shared/services/auth-service';
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

  // Player UX enhancements
  playbackSpeed = 1;
  playbackRates = [0.75, 1, 1.25, 1.5, 2];
  autoPlayNext = true;
  upNextCountdown: number | null = null;
  private upNextTimer: any = null;
  claimingCert = false;

  // Materials / Notes
  notes: any[] = [];
  newNoteText = '';
  savingNote = false;

  // Q&A Discussions
  discussions: any[] = [];
  newQuestionTitle = '';
  newQuestionContent = '';
  attachQuestionTimestamp = true;
  postingDiscussion = false;
  replyDrafts: Record<number, string> = {};

  // Quiz runner state
  activeQuiz: any = null;
  quizLoading = false;
  submittingQuiz = false;
  selectedAnswers: Record<number, number[]> = {};
  quizResult: any = null;
  quizAttempts: any[] = [];
  quizSecondsLeft = 0;
  private quizTimer: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private mediaService: MediaService,
    private progressService: ProgressService,
    private quizService: QuizService,
    private discussionService: DiscussionService,
    private certificateService: CertificateService,
    private dialogService: DialogService,
    public authService: AuthService,
    public utilityService: UtilityService,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService,
  ) {}

  ngOnInit(): void {
    this.courseId = Number(this.route.snapshot.paramMap.get('courseId'));
    this.loadCourse();
  }

  ngOnDestroy(): void {
    this.cancelUpNext();
    this.clearQuizTimer();
    this.flushVideoProgress(false);
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable)
    ) {
      return;
    }
    const video = this.videoRef?.nativeElement;
    if (!video || !this.videoUrl) return;

    if (event.code === 'Space') {
      event.preventDefault();
      if (video.paused) video.play().catch(() => {});
      else video.pause();
    } else if (event.code === 'ArrowLeft') {
      event.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - 5);
    } else if (event.code === 'ArrowRight') {
      event.preventDefault();
      video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 5);
    } else if (event.key === 'm' || event.key === 'M') {
      video.muted = !video.muted;
    }
  }

  loadCourse(preserveEpisodeId?: number): void {
    this.loading = true;
    const requestedEpId =
      preserveEpisodeId || Number(this.route.snapshot.queryParamMap.get('ep')) || undefined;

    this.courseService
      .getCourseDetail(this.courseId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
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
        },
        error: (err) => {
          this.errorHandler.handle(err, 'Failed to load course');
        },
      });
  }

  selectEpisode(topic: any, episode: any, savePrevious: boolean = true): void {
    this.cancelUpNext();
    this.clearQuizTimer();
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

    this.activeQuiz = null;
    this.quizResult = null;
    this.selectedAnswers = {};
    this.quizAttempts = [];

    this.loadNotes(episode.id);
    this.loadDiscussions(episode.id);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ep: episode.id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  onVideoLoadedMetadata(): void {
    const el = this.videoRef?.nativeElement;
    if (!el) return;
    el.playbackRate = this.playbackSpeed;
    if (this.resumedInitialSeek || !this.currentEpisode) return;
    this.resumedInitialSeek = true;
    const saved = this.currentEpisode.watchedSeconds || 0;
    if (saved > 2 && el.duration && saved < el.duration - 3) {
      el.currentTime = saved;
    }
  }

  setPlaybackSpeed(rate: number): void {
    this.playbackSpeed = rate;
    if (this.videoRef?.nativeElement) {
      this.videoRef.nativeElement.playbackRate = rate;
    }
  }

  onVideoTimeUpdate(): void {
    const el = this.videoRef?.nativeElement;
    if (!el) return;
    const sec = Math.floor(el.currentTime || 0);
    if (sec !== this.currentVideoTime) {
      this.currentVideoTime = sec;
    }
    if (Math.abs(sec - this.lastSavedSecond) >= 10) {
      this.flushVideoProgress(false);
    }
  }

  onVideoEnded(): void {
    this.flushVideoProgress(true);
    if (this.autoPlayNext && this.currentEpisodeIndex < this.flatEpisodes.length - 1) {
      this.startUpNextCountdown();
    }
  }

  private startUpNextCountdown(): void {
    this.cancelUpNext();
    this.upNextCountdown = 5;
    this.upNextTimer = setInterval(() => {
      if (this.upNextCountdown === null) return;
      if (this.upNextCountdown <= 1) {
        this.cancelUpNext();
        this.goNextEpisode();
      } else {
        this.upNextCountdown--;
      }
    }, 1000);
  }

  cancelUpNext(): void {
    if (this.upNextTimer) {
      clearInterval(this.upNextTimer);
      this.upNextTimer = null;
    }
    this.upNextCountdown = null;
  }

  get nextEpisodeTitle(): string {
    const idx = this.currentEpisodeIndex;
    if (idx >= 0 && idx < this.flatEpisodes.length - 1) {
      const next = this.flatEpisodes[idx + 1].episode;
      return `EP ${next.episodeNumber}: ${next.title}`;
    }
    return '';
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
    const allQuizzesPassed = (this.course.topics || [])
      .flatMap((t: any) => t.episodes || [])
      .flatMap((e: any) => e.quizzes || [])
      .every((q: any) => q.passed === true);
    this.course.allQuizzesPassed = allQuizzesPassed;
    this.course.certificateEligible =
      total > 0 && this.course.progressPercent >= 100 && allQuizzesPassed;
  }

  claimCertificate(): void {
    if (!this.course || this.claimingCert) return;
    this.claimingCert = true;
    this.certificateService
      .issueOrGetCertificate(this.course.id)
      .pipe(finalize(() => (this.claimingCert = false)))
      .subscribe({
        next: (cert: any) => {
          this.course.certificateCode = cert.certificateCode;
          this.dialogService.openCertificateDialog(cert);
        },
        error: (err) => this.errorHandler.handle(err, 'Unable to claim certificate'),
      });
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
    this.clearQuizTimer();
    this.quizLoading = true;
    this.quizResult = null;
    this.selectedAnswers = {};

    this.quizService
      .getQuiz(quizSummary.id)
      .pipe(finalize(() => (this.quizLoading = false)))
      .subscribe({
        next: (quiz: any) => {
          this.activeQuiz = quiz;
          this.loadQuizAttempts(quiz.id);
          if (quiz.timeLimitMinutes && quiz.timeLimitMinutes > 0) {
            this.startQuizTimer(quiz.timeLimitMinutes * 60);
          }
        },
        error: (err) => {
          this.errorHandler.handle(err, 'Failed to load quiz');
        },
      });
  }

  private startQuizTimer(seconds: number): void {
    this.clearQuizTimer();
    this.quizSecondsLeft = seconds;
    this.quizTimer = setInterval(() => {
      if (this.quizSecondsLeft <= 1) {
        this.clearQuizTimer();
        this.notification.info('Time is up! Auto-submitting your quiz.');
        this.submitQuiz();
      } else {
        this.quizSecondsLeft--;
      }
    }, 1000);
  }

  private clearQuizTimer(): void {
    if (this.quizTimer) {
      clearInterval(this.quizTimer);
      this.quizTimer = null;
    }
    this.quizSecondsLeft = 0;
  }

  loadQuizAttempts(quizId: number): void {
    this.quizService.getAttempts(quizId).subscribe({
      next: (attempts: any) => {
        this.quizAttempts = attempts || [];
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
    if (!this.activeQuiz || this.submittingQuiz) return;
    this.clearQuizTimer();
    this.submittingQuiz = true;
    this.quizService
      .submitQuiz(this.activeQuiz.id, this.selectedAnswers)
      .pipe(finalize(() => (this.submittingQuiz = false)))
      .subscribe({
        next: (result: any) => {
          this.quizResult = result;
          this.loadQuizAttempts(this.activeQuiz.id);

          const summary = (this.currentEpisode?.quizzes || []).find(
            (q: any) => q.id === this.activeQuiz.id,
          );
          if (summary) {
            summary.bestScore = Math.max(summary.bestScore || 0, result.scorePercent);
            summary.passed = summary.passed || result.passed;
            this.recalculateCourseProgress();
          }
        },
        error: (err) => {
          this.errorHandler.handle(err, 'Failed to submit quiz');
        },
      });
  }

  // ===== Notes =====
  loadNotes(episodeId: number): void {
    this.progressService.getNotes(episodeId).subscribe({
      next: (notes: any) => {
        this.notes = notes || [];
      },
    });
  }

  addNote(): void {
    if (!this.currentEpisode || !this.newNoteText.trim() || this.savingNote) return;
    this.savingNote = true;
    const timestampSeconds = this.videoRef?.nativeElement
      ? Math.floor(this.videoRef.nativeElement.currentTime || 0)
      : this.currentVideoTime;

    this.progressService
      .createNote(this.currentEpisode.id, {
        timestampSeconds,
        content: this.newNoteText.trim(),
      })
      .pipe(finalize(() => (this.savingNote = false)))
      .subscribe({
        next: (note) => {
          this.newNoteText = '';
          this.notes = [...this.notes, note].sort((a, b) => a.timestampSeconds - b.timestampSeconds);
          this.notification.success('Note saved');
        },
        error: (err) => {
          this.errorHandler.handle(err, 'Failed to save note');
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
      },
      error: (err) => this.errorHandler.handle(err, 'Failed to delete note'),
    });
  }

  // ===== Q&A Discussions =====
  loadDiscussions(episodeId: number): void {
    this.discussionService.getEpisodeDiscussions(episodeId).subscribe({
      next: (list: any) => {
        this.discussions = list || [];
      },
    });
  }

  postDiscussion(): void {
    if (!this.currentEpisode || !this.newQuestionTitle.trim() || !this.newQuestionContent.trim() || this.postingDiscussion) {
      return;
    }
    this.postingDiscussion = true;
    const videoTimestamp = this.attachQuestionTimestamp ? this.currentVideoTime : 0;

    this.discussionService
      .createDiscussion(this.currentEpisode.id, {
        title: this.newQuestionTitle.trim(),
        content: this.newQuestionContent.trim(),
        videoTimestamp,
      })
      .pipe(finalize(() => (this.postingDiscussion = false)))
      .subscribe({
        next: (created) => {
          this.newQuestionTitle = '';
          this.newQuestionContent = '';
          this.discussions = [created, ...this.discussions];
          this.notification.success('Question posted');
        },
        error: (err) => this.errorHandler.handle(err, 'Failed to post question'),
      });
  }

  postReply(discussion: any): void {
    const text = (this.replyDrafts[discussion.id] || '').trim();
    if (!text) return;

    this.discussionService.addReply(discussion.id, text).subscribe({
      next: (updated: any) => {
        this.replyDrafts[discussion.id] = '';
        Object.assign(discussion, updated);
        this.notification.success('Reply posted');
      },
      error: (err) => this.errorHandler.handle(err, 'Failed to post reply'),
    });
  }

  toggleDiscussionResolved(discussion: any): void {
    this.discussionService.toggleResolved(discussion.id).subscribe({
      next: (updated) => Object.assign(discussion, updated),
      error: (err) => this.errorHandler.handle(err, 'Failed to update discussion'),
    });
  }

  toggleDiscussionPinned(discussion: any): void {
    this.discussionService.togglePinned(discussion.id).subscribe({
      next: (updated) => {
        Object.assign(discussion, updated);
        this.loadDiscussions(this.currentEpisode.id);
      },
      error: (err) => this.errorHandler.handle(err, 'Failed to update pin status'),
    });
  }

  deleteDiscussion(discussionId: number): void {
    this.discussionService.deleteDiscussion(discussionId).subscribe({
      next: () => {
        this.discussions = this.discussions.filter((d) => d.id !== discussionId);
        this.notification.success('Discussion deleted');
      },
      error: (err) => this.errorHandler.handle(err, 'Failed to delete discussion'),
    });
  }

  backToCatalog(): void {
    this.router.navigate(['/courses', this.courseId]);
  }
}
