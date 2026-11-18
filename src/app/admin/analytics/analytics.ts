import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { AnalyticsService } from '../../shared/services/analytics-service';
import { UtilityService } from '../../shared/services/utility-service';
import { ErrorHandlerService } from '../../shared/services/error-handler-service';

@Component({
  selector: 'app-analytics',
  standalone: false,
  templateUrl: './analytics.html',
  styleUrl: './analytics.css',
})
export class Analytics implements OnInit {
  overview: any = null;
  loading = true;

  selectedCourse: any = null;
  learners: any[] = [];
  learnersLoading = false;

  constructor(
    private analyticsService: AnalyticsService,
    public utilityService: UtilityService,
    private errorHandler: ErrorHandlerService,
  ) {}

  ngOnInit(): void {
    this.loadOverview();
  }

  loadOverview(): void {
    this.loading = true;
    this.analyticsService
      .getOverview()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data: any) => {
          this.overview = data;
          if (!this.selectedCourse && data?.courses?.length > 0) {
            this.selectCourse(data.courses[0]);
          }
        },
        error: (err) => this.errorHandler.handle(err, 'Failed to load analytics'),
      });
  }

  selectCourse(courseItem: any): void {
    this.selectedCourse = courseItem;
    this.learnersLoading = true;
    this.analyticsService
      .getCourseLearners(courseItem.courseId)
      .pipe(finalize(() => (this.learnersLoading = false)))
      .subscribe({
        next: (rows: any) => {
          this.learners = rows || [];
        },
        error: (err) => this.errorHandler.handle(err, 'Failed to load learners'),
      });
  }

  exportCsv(courseItem: any, event?: Event): void {
    event?.stopPropagation();
    this.analyticsService.exportCourseLearnersCsv(courseItem.courseId).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `course-${courseItem.courseId}-learners.csv`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => this.errorHandler.handle(err, 'Failed to export CSV'),
    });
  }
}
