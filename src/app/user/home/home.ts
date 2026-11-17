import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
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
  loadingMore = false;
  error = false;
  searchQuery = '';
  selectedCategory = '';
  categories = COURSE_CATEGORIES;

  featuredCourses: any[] = [];
  currentSlideIndex = 0;
  featuredLoading = true;

  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  hasMoreCourses = true;

  private searchSubject = new Subject<string>();
  private sliderInterval: any;

  constructor(
    private courseService: CourseService,
    private progressService: ProgressService,
    private notification: NotificationService,
    public utilityService: UtilityService,
    public mediaService: MediaService,
    private errorHandler: ErrorHandlerService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadFeaturedCourses();
    this.loadCourses();
    this.searchSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe(() => {
      this.currentPage = 0;
      this.loadCourses();
    });
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
    if (this.sliderInterval) clearInterval(this.sliderInterval);
  }

  loadFeaturedCourses(): void {
    this.featuredLoading = true;
    this.courseService.getFeaturedCourses().subscribe({
      next: (courses: any) => {
        this.featuredCourses = courses || [];
        this.featuredLoading = false;
        if (this.featuredCourses.length > 1) {
          this.sliderInterval = setInterval(() => this.nextSlide(), 5000);
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.featuredLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  nextSlide(): void {
    if (this.featuredCourses.length > 0) {
      this.currentSlideIndex = (this.currentSlideIndex + 1) % this.featuredCourses.length;
      this.cdr.detectChanges();
    }
  }

  prevSlide(): void {
    if (this.featuredCourses.length > 0) {
      this.currentSlideIndex =
        (this.currentSlideIndex - 1 + this.featuredCourses.length) % this.featuredCourses.length;
      this.cdr.detectChanges();
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const pos = window.pageYOffset + window.innerHeight;
    const height = document.documentElement.scrollHeight;
    if (pos >= height - 200 && !this.loadingMore && !this.loading && this.hasMoreCourses) {
      this.loadMoreCourses();
    }
  }

  loadCourses(): void {
    this.error = false;
    this.currentPage = 0;
    this.courses = [];
    this.loading = true;
    const search = this.searchQuery.trim() || undefined;
    const category = this.selectedCategory || undefined;

    this.courseService.getPublishedCourses(0, this.pageSize, search, category).subscribe({
      next: (res: any) => {
        this.courses = res.content || [];
        this.currentPage = res.number || 0;
        this.totalElements = res.totalElements || 0;
        this.totalPages = res.totalPages || 0;
        this.hasMoreCourses = this.currentPage < this.totalPages - 1;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = true;
        this.loading = false;
        this.errorHandler.handle(err, 'Failed to load courses');
        this.cdr.detectChanges();
      },
    });
  }

  loadMoreCourses(): void {
    if (this.loadingMore || !this.hasMoreCourses) return;
    this.loadingMore = true;
    const nextPage = this.currentPage + 1;
    const search = this.searchQuery.trim() || undefined;
    const category = this.selectedCategory || undefined;

    this.courseService.getPublishedCourses(nextPage, this.pageSize, search, category).subscribe({
      next: (res: any) => {
        this.courses = [...this.courses, ...(res.content || [])];
        this.currentPage = res.number;
        this.hasMoreCourses = this.currentPage < this.totalPages - 1;
        this.loadingMore = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingMore = false;
        this.cdr.detectChanges();
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
    this.selectedCategory = this.selectedCategory === category ? '' : category;
    this.loadCourses();
  }

  openCourse(course: any): void {
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
