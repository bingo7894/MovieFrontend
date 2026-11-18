import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { CourseService } from '../../shared/services/course-service';
import { ProgressService } from '../../shared/services/progress-service';
import { ReviewService } from '../../shared/services/review-service';
import { CertificateService } from '../../shared/services/certificate-service';
import { DialogService } from '../../shared/services/dialog-service';
import { MediaService } from '../../shared/services/media-service';
import { UtilityService } from '../../shared/services/utility-service';
import { NotificationService } from '../../shared/services/notification-service';
import { ErrorHandlerService } from '../../shared/services/error-handler-service';
import { AuthService } from '../../shared/services/auth-service';

@Component({
  selector: 'app-course-detail',
  standalone: false,
  templateUrl: './course-detail.html',
  styleUrl: './course-detail.css',
})
export class CourseDetail implements OnInit {
  courseId!: number;
  course: any = null;
  loading = true;

  reviewsOverview: any = { averageRating: 0, reviewCount: 0, userReview: null, reviews: [] };
  myRating = 5;
  myComment = '';
  savingReview = false;
  claimingCert = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private progressService: ProgressService,
    private reviewService: ReviewService,
    private certificateService: CertificateService,
    private dialogService: DialogService,
    public mediaService: MediaService,
    public utilityService: UtilityService,
    private authService: AuthService,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService,
  ) {}

  ngOnInit(): void {
    this.courseId = Number(this.route.snapshot.paramMap.get('courseId'));
    this.loadDetail();
    this.loadReviews();
  }

  loadDetail(): void {
    this.loading = true;
    this.courseService
      .getCourseDetail(this.courseId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (course) => {
          this.course = course;
        },
        error: (err) => this.errorHandler.handle(err, 'Failed to load course details'),
      });
  }

  loadReviews(): void {
    this.reviewService.getCourseReviews(this.courseId).subscribe({
      next: (res: any) => {
        this.reviewsOverview = res;
        if (res.userReview) {
          this.myRating = res.userReview.rating;
          this.myComment = res.userReview.comment || '';
        }
      },
    });
  }

  startLearning(episodeId?: number): void {
    const queryParams = episodeId ? { ep: episodeId } : undefined;
    this.router.navigate(['/courses', this.courseId, 'learn'], { queryParams });
  }

  toggleEnrollment(): void {
    if (!this.course) return;
    const op$ = this.course.enrolled
      ? this.progressService.unenrollCourse(this.course.id)
      : this.progressService.enrollCourse(this.course.id);

    op$.subscribe({
      next: () => {
        this.course.enrolled = !this.course.enrolled;
        this.course.enrollmentCount += this.course.enrolled ? 1 : -1;
        this.notification.success(
          this.course.enrolled ? 'Saved to My Learning' : 'Removed from My Learning',
        );
      },
      error: (err) => this.errorHandler.handle(err, 'Failed to update enrollment'),
    });
  }

  claimCertificate(): void {
    if (this.claimingCert) return;
    this.claimingCert = true;
    this.certificateService
      .issueOrGetCertificate(this.courseId)
      .pipe(finalize(() => (this.claimingCert = false)))
      .subscribe({
        next: (cert: any) => {
          this.course.certificateCode = cert.certificateCode;
          this.dialogService.openCertificateDialog(cert);
        },
        error: (err) => this.errorHandler.handle(err, 'Unable to claim certificate'),
      });
  }

  submitReview(): void {
    if (this.savingReview || !this.myRating) return;
    this.savingReview = true;
    this.reviewService
      .upsertReview(this.courseId, { rating: this.myRating, comment: this.myComment.trim() })
      .pipe(finalize(() => (this.savingReview = false)))
      .subscribe({
        next: () => {
          this.notification.success('Review saved');
          this.loadReviews();
        },
        error: (err) => this.errorHandler.handle(err, 'Failed to save review'),
      });
  }

  deleteReview(reviewId: number): void {
    this.reviewService.deleteReview(reviewId).subscribe({
      next: () => {
        this.notification.success('Review deleted');
        this.myRating = 5;
        this.myComment = '';
        this.loadReviews();
      },
      error: (err) => this.errorHandler.handle(err, 'Failed to delete review'),
    });
  }

  canDeleteReview(r: any): boolean {
    return r.ownReview || this.authService.isAdmin();
  }

  getThumbnailUrl(): string {
    return this.mediaService.getMediaUrl(this.course, 'image', { useCache: true }) || '';
  }

  backToCatalog(): void {
    this.router.navigate(['/home']);
  }
}
