import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, Subject, Subscription } from 'rxjs';
import { COURSE_CATEGORIES } from '../../shared/constants/app.constants';
import { CourseService } from '../../shared/services/course-service';
import { ProgressService } from '../../shared/services/progress-service';
import { NotificationService } from '../../shared/services/notification-service';
import { UtilityService } from '../../shared/services/utility-service';
import { MediaService } from '../../shared/services/media-service';
import { ErrorHandlerService } from '../../shared/services/error-handler-service';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, OnDestroy {
  courses: any[] = [];
  loading = true;
  refreshing = false;
  hasLoadedOnce = false;
  loadingMore = false;
  error = false;
  searchQuery = '';
  selectedCategory = '';
  categories = COURSE_CATEGORIES;

  featuredCourses: any[] = [];
  inProgressCourses: any[] = [];
  currentSlideIndex = 0;
  featuredLoading = true;

  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  hasMoreCourses = true;

  private searchSubject = new Subject<string>();
  private sliderInterval: any;
  private coursesSub: Subscription | null = null;
  private searchSub: Subscription | null = null;

  constructor(
    private courseService: CourseService,
    private progressService: ProgressService,
    private notification: NotificationService,
    public utilityService: UtilityService,
    public mediaService: MediaService,
    private errorHandler: ErrorHandlerService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadFeaturedCourses();
    this.loadInProgressCourses();
    this.loadCourses();
    this.searchSub = this.searchSubject.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => {
      this.currentPage = 0;
      this.loadCourses();
    });
  }

  ngOnDestroy(): void {
    this.coursesSub?.unsubscribe();
    this.searchSub?.unsubscribe();
    this.searchSubject.complete();
    if (this.sliderInterval) clearInterval(this.sliderInterval);
  }

  loadFeaturedCourses(): void {
    this.featuredLoading = true;
    this.courseService
      .getFeaturedCourses()
      .pipe(finalize(() => (this.featuredLoading = false)))
      .subscribe({
        next: (courses: any) => {
          this.featuredCourses = courses || [];
          if (this.featuredCourses.length > 1) {
            this.sliderInterval = setInterval(() => this.nextSlide(), 6000);
          }
        },
      });
  }

  loadInProgressCourses(): void {
    this.courseService.getInProgressCourses().subscribe({
      next: (courses: any) => {
        this.inProgressCourses = courses || [];
      },
    });
  }

  nextSlide(): void {
    if (this.featuredCourses.length > 0) {
      this.currentSlideIndex = (this.currentSlideIndex + 1) % this.featuredCourses.length;
    }
  }

  prevSlide(): void {
    if (this.featuredCourses.length > 0) {
      this.currentSlideIndex =
        (this.currentSlideIndex - 1 + this.featuredCourses.length) % this.featuredCourses.length;
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const pos = window.pageYOffset + window.innerHeight;
    const height = document.documentElement.scrollHeight;
    if (pos >= height - 200 && !this.loadingMore && !this.loading && !this.refreshing && this.hasMoreCourses) {
      this.loadMoreCourses();
    }
  }

  loadCourses(): void {
    this.error = false;
    this.currentPage = 0;
    if (!this.hasLoadedOnce) {
      this.loading = true;
    } else {
      this.refreshing = true;
    }

    const search = this.searchQuery.trim() || undefined;
    const category = this.selectedCategory || undefined;

    this.coursesSub?.unsubscribe();
    this.coursesSub = this.courseService
      .getPublishedCourses(0, this.pageSize, search, category)
      .pipe(
        finalize(() => {
          this.hasLoadedOnce = true;
          this.loading = false;
          this.refreshing = false;
        }),
      )
      .subscribe({
        next: (res: any) => {
          this.courses = res.content || [];
          this.currentPage = res.number || 0;
          this.totalElements = res.totalElements || 0;
          this.totalPages = res.totalPages || 0;
          this.hasMoreCourses = this.currentPage < this.totalPages - 1;
        },
        error: (err) => {
          if (!this.hasLoadedOnce) {
            this.error = true;
          }
          this.errorHandler.handle(err, 'Failed to load courses');
        },
      });
  }

  loadMoreCourses(): void {
    if (this.loadingMore || !this.hasMoreCourses) return;
    this.loadingMore = true;
    const nextPage = this.currentPage + 1;
    const search = this.searchQuery.trim() || undefined;
    const category = this.selectedCategory || undefined;

    this.courseService
      .getPublishedCourses(nextPage, this.pageSize, search, category)
      .pipe(finalize(() => (this.loadingMore = false)))
      .subscribe({
        next: (res: any) => {
          this.courses = [...this.courses, ...(res.content || [])];
          this.currentPage = res.number;
          this.hasMoreCourses = this.currentPage < this.totalPages - 1;
        },
      });
  }

  onSearch(): void {
    this.searchSubject.next(this.searchQuery);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.loadCourses();
  }

  selectCategory(category: string): void {
    const next = category === '' ? '' : this.selectedCategory === category ? '' : category;
    if (next === this.selectedCategory) return;
    this.selectedCategory = next;
    this.loadCourses();
  }

  openCourse(course: any): void {
    this.router.navigate(['/courses', course.id]);
  }

  startLearning(course: any): void {
    this.router.navigate(['/courses', course.id, 'learn']);
  }

  toggleEnrollment(course: any, event: Event): void {
    event.stopPropagation();
    const nextEnrolled = !course.enrolled;
    course.enrolled = nextEnrolled;

    const op$ = nextEnrolled
      ? this.progressService.enrollCourse(course.id)
      : this.progressService.unenrollCourse(course.id);

    op$.subscribe({
      next: () => {
        this.notification.success(nextEnrolled ? 'Saved to My Learning' : 'Removed from My Learning');
      },
      error: (err) => {
        course.enrolled = !nextEnrolled;
        this.errorHandler.handle(err, 'Failed to update enrollment');
      },
    });
  }

  getThumbnailUrl(course: any): string {
    return this.mediaService.getMediaUrl(course, 'image', { useCache: true }) || '';
  }
}
