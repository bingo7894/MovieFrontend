import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, Subject, Subscription } from 'rxjs';
import { CourseService } from '../../shared/services/course-service';
import { DialogService } from '../../shared/services/dialog-service';
import { NotificationService } from '../../shared/services/notification-service';
import { UtilityService } from '../../shared/services/utility-service';
import { MediaService } from '../../shared/services/media-service';
import { ErrorHandlerService } from '../../shared/services/error-handler-service';

@Component({
  selector: 'app-course-list',
  standalone: false,
  templateUrl: './course-list.html',
  styleUrl: './course-list.css',
})
export class CourseList implements OnInit, OnDestroy {
  courses: any[] = [];
  loading = true;
  refreshing = false;
  hasLoadedOnce = false;
  loadingMore = false;
  searchQuery = '';

  pageSize = 10;
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  hasMore = true;

  stats: any = {
    totalCourses: 0,
    publishedCourses: 0,
    totalTopics: 0,
    totalEpisodes: 0,
    totalDuration: 0,
    totalQuizzes: 0,
  };

  private searchSubject = new Subject<string>();
  private coursesSub: Subscription | null = null;
  private searchSub: Subscription | null = null;

  constructor(
    private courseService: CourseService,
    private dialogService: DialogService,
    private notification: NotificationService,
    public utilityService: UtilityService,
    public mediaService: MediaService,
    private errorHandler: ErrorHandlerService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadStats();
    this.searchSub = this.searchSubject.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => {
      this.load();
    });
  }

  ngOnDestroy(): void {
    this.coursesSub?.unsubscribe();
    this.searchSub?.unsubscribe();
    this.searchSubject.complete();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const pos = window.pageYOffset + window.innerHeight;
    const height = document.documentElement.scrollHeight;
    if (pos >= height - 200 && !this.loadingMore && !this.loading && !this.refreshing && this.hasMore) {
      this.loadMore();
    }
  }

  load(): void {
    this.currentPage = 0;
    if (!this.hasLoadedOnce) {
      this.loading = true;
    } else {
      this.refreshing = true;
    }
    const search = this.searchQuery.trim() || undefined;

    this.coursesSub?.unsubscribe();
    this.coursesSub = this.courseService
      .getAllAdminCourses(0, this.pageSize, search)
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
          this.totalElements = res.totalElements || 0;
          this.totalPages = res.totalPages || 0;
          this.currentPage = res.number || 0;
          this.hasMore = this.currentPage < this.totalPages - 1;
        },
        error: (err) => {
          this.errorHandler.handle(err, 'Failed to load courses');
        },
      });
  }

  loadMore(): void {
    if (this.loadingMore || !this.hasMore) return;
    this.loadingMore = true;
    const nextPage = this.currentPage + 1;
    const search = this.searchQuery.trim() || undefined;

    this.courseService
      .getAllAdminCourses(nextPage, this.pageSize, search)
      .pipe(finalize(() => (this.loadingMore = false)))
      .subscribe({
        next: (res: any) => {
          this.courses = [...this.courses, ...(res.content || [])];
          this.currentPage = res.number;
          this.hasMore = this.currentPage < this.totalPages - 1;
        },
        error: (err) => {
          this.errorHandler.handle(err, 'Failed to load more courses');
        },
      });
  }

  loadStats(): void {
    this.courseService.getAdminStats().subscribe({
      next: (stats) => {
        this.stats = stats;
      },
    });
  }

  onSearchChange(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value;
    this.searchSubject.next(this.searchQuery);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.load();
  }

  createNew(): void {
    this.dialogService
      .openCourseFormDialog('create')
      .afterClosed()
      .subscribe((created) => {
        if (created) {
          this.load();
          this.loadStats();
        }
      });
  }

  edit(course: any): void {
    this.dialogService
      .openCourseFormDialog('edit', course)
      .afterClosed()
      .subscribe((updated) => {
        if (updated) {
          Object.assign(course, updated);
          this.loadStats();
        }
      });
  }

  manageCurriculum(course: any): void {
    this.router.navigate(['/admin/courses', course.id, 'curriculum']);
  }

  togglePublish(event: any, course: any): void {
    if (course._toggling) {
      if (event.source) event.source.checked = course.published;
      return;
    }
    const nextState = event.checked;
    course._toggling = true;
    course.published = nextState;

    this.courseService
      .togglePublish(course.id, nextState)
      .pipe(finalize(() => (course._toggling = false)))
      .subscribe({
        next: () => {
          this.notification.success(`Course ${nextState ? 'published' : 'unpublished'}`);
          this.loadStats();
        },
        error: (err) => {
          course.published = !nextState;
          if (event.source) event.source.checked = course.published;
          this.errorHandler.handle(err, 'Failed to update publish status');
        },
      });
  }

  remove(course: any): void {
    this.dialogService
      .openConfirmation(
        'Delete Course?',
        `Delete "${course.title}" and all its topics, episodes, attachments, and quizzes?`,
        'Delete',
        'Cancel',
        'danger',
      )
      .subscribe((ok) => {
        if (!ok) return;
        this.courseService.deleteCourse(course.id).subscribe({
          next: () => {
            this.notification.success('Course deleted successfully');
            this.courses = this.courses.filter((c) => c.id !== course.id);
            this.totalElements = Math.max(0, this.totalElements - 1);
            this.loadStats();
          },
          error: (err) => this.errorHandler.handle(err, 'Failed to delete course'),
        });
      });
  }

  getThumbnailUrl(course: any): string {
    return this.mediaService.getMediaUrl(course, 'image', { useCache: true }) || '';
  }
}
