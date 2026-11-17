import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { ProgressService } from '../../shared/services/progress-service';
import { NotificationService } from '../../shared/services/notification-service';
import { UtilityService } from '../../shared/services/utility-service';
import { MediaService } from '../../shared/services/media-service';
import { ErrorHandlerService } from '../../shared/services/error-handler-service';

@Component({
  selector: 'app-my-favorites',
  standalone: false,
  templateUrl: './my-favorites.html',
  styleUrl: './my-favorites.css',
})
export class MyFavorites implements OnInit, OnDestroy {
  courses: any[] = [];
  loading = true;
  loadingMore = false;
  error = false;
  searchQuery = '';

  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  hasMore = true;

  private searchSubject = new Subject<string>();

  constructor(
    private progressService: ProgressService,
    private notification: NotificationService,
    public utilityService: UtilityService,
    public mediaService: MediaService,
    private errorHandler: ErrorHandlerService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadCourses();
    this.searchSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe(() => {
      this.currentPage = 0;
      this.loadCourses();
    });
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const pos = window.pageYOffset + window.innerHeight;
    const height = document.documentElement.scrollHeight;
    if (pos >= height - 200 && !this.loadingMore && !this.loading && this.hasMore) {
      this.loadMore();
    }
  }

  loadCourses(): void {
    this.error = false;
    this.currentPage = 0;
    this.courses = [];
    this.loading = true;
    const search = this.searchQuery.trim() || undefined;

    this.progressService.getEnrolledCourses(0, this.pageSize, search).subscribe({
      next: (res: any) => {
        this.courses = res.content || [];
        this.currentPage = res.number || 0;
        this.totalElements = res.totalElements || 0;
        this.totalPages = res.totalPages || 0;
        this.hasMore = this.currentPage < this.totalPages - 1;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = true;
        this.loading = false;
        this.errorHandler.handle(err, 'Failed to load enrolled courses');
        this.cdr.detectChanges();
      },
    });
  }

  loadMore(): void {
    if (this.loadingMore || !this.hasMore) return;
    this.loadingMore = true;
    const nextPage = this.currentPage + 1;
    const search = this.searchQuery.trim() || undefined;

    this.progressService.getEnrolledCourses(nextPage, this.pageSize, search).subscribe({
      next: (res: any) => {
        this.courses = [...this.courses, ...(res.content || [])];
        this.currentPage = res.number;
        this.hasMore = this.currentPage < this.totalPages - 1;
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

  openCourse(course: any): void {
    this.router.navigate(['/courses', course.id, 'learn']);
  }

  unenroll(course: any, event: Event): void {
    event.stopPropagation();
    this.progressService.unenrollCourse(course.id).subscribe({
      next: () => {
        this.courses = this.courses.filter((c) => c.id !== course.id);
        this.notification.success('Removed from My Learning');
        this.cdr.detectChanges();
      },
      error: (err) => this.errorHandler.handle(err, 'Failed to remove course'),
    });
  }

  getThumbnailUrl(course: any): string {
    return this.mediaService.getMediaUrl(course, 'image', { useCache: true }) || '';
  }
}
