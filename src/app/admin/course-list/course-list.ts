import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
export class CourseList implements OnInit {
  courses: any[] = [];
  loading = false;
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

  constructor(
    private courseService: CourseService,
    private dialogService: DialogService,
    private notification: NotificationService,
    public utilityService: UtilityService,
    public mediaService: MediaService,
    private errorHandler: ErrorHandlerService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadStats();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const pos = window.pageYOffset + window.innerHeight;
    const height = document.documentElement.scrollHeight;
    if (pos >= height - 200 && !this.loadingMore && !this.loading && this.hasMore) {
      this.loadMore();
    }
  }

  load(): void {
    this.loading = true;
    this.currentPage = 0;
    this.courses = [];
    const search = this.searchQuery.trim() || undefined;

    this.courseService.getAllAdminCourses(0, this.pageSize, search).subscribe({
      next: (res: any) => {
        this.courses = res.content || [];
        this.totalElements = res.totalElements || 0;
        this.totalPages = res.totalPages || 0;
        this.currentPage = res.number || 0;
        this.hasMore = this.currentPage < this.totalPages - 1;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.errorHandler.handle(err, 'Failed to load courses');
        this.cdr.detectChanges();
      },
    });
  }

  loadMore(): void {
    if (this.loadingMore || !this.hasMore) return;
    this.loadingMore = true;
    const nextPage = this.currentPage + 1;
    const search = this.searchQuery.trim() || undefined;

    this.courseService.getAllAdminCourses(nextPage, this.pageSize, search).subscribe({
      next: (res: any) => {
        this.courses = [...this.courses, ...(res.content || [])];
        this.currentPage = res.number;
        this.hasMore = this.currentPage < this.totalPages - 1;
        this.loadingMore = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadingMore = false;
        this.errorHandler.handle(err, 'Failed to load more courses');
        this.cdr.detectChanges();
      },
    });
  }

  loadStats(): void {
    this.courseService.getAdminStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.cdr.detectChanges();
      },
    });
  }

  onSearchChange(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value;
    this.load();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.load();
  }

  createNew(): void {
    this.dialogService.openCourseFormDialog('create').afterClosed().subscribe((created) => {
      if (created) {
        this.load();
        this.loadStats();
      }
    });
  }

  edit(course: any): void {
    this.dialogService.openCourseFormDialog('edit', course).afterClosed().subscribe((updated) => {
      if (updated) {
        Object.assign(course, updated);
        this.loadStats();
        this.cdr.detectChanges();
      }
    });
  }

  manageCurriculum(course: any): void {
    this.router.navigate(['/admin/courses', course.id, 'curriculum']);
  }

  togglePublish(event: any, course: any): void {
    const nextState = event.checked;
    course.published = nextState;
    this.courseService.togglePublish(course.id, nextState).subscribe({
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
            this.load();
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
