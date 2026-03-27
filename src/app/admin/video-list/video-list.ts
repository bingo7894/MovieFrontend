import { ChangeDetectorRef, Component, ErrorHandler, HostListener, OnInit } from '@angular/core';
import { DialogService } from '../../shared/services/dialog-service';
import { MatTableDataSource } from '@angular/material/table';
import { NotificationService } from '../../shared/services/notification-service';
import { UtilityService } from '../../shared/services/utility-service';
import { MediaService } from '../../shared/services/media-service';
import { VideoService } from '../../shared/services/video-service';
import { ErrorHandlerService } from '../../shared/services/error-handler-service';

@Component({
  selector: 'app-video-list',
  standalone: false,
  templateUrl: './video-list.html',
  styleUrl: './video-list.css',
})
export class VideoList implements OnInit {
  pageVideos: any = [];
  loading = false;
  loadingMore = false;
  searchQuery = '';

  pageSize = 10;
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  hasMoreVideos = true;

  totalVideos = 0;
  publishedVideos = 0;
  totalDurationSeconds = 0;

  // data = new MatTableDataSource<any>([]);

  constructor(
    private dialogService: DialogService,
    private notification: NotificationService,
    public utilityService: UtilityService,
    public mediaService: MediaService,
    private videoService: VideoService,
    private errorHandlerService: ErrorHandlerService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadStats();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const scrollPosition = window.pageYOffset + window.innerHeight;
    const pageHeight = document.documentElement.scrollHeight;

    if (
      scrollPosition >= pageHeight - 200 &&
      !this.loadingMore &&
      !this.loading &&
      this.hasMoreVideos
    ) {
      this.loadMoreVideos();
    }
  }

  load() {
    this.loading = true;
    this.currentPage = 0;
    this.pageVideos = [];
    const search = this.searchQuery.trim() || undefined;

    this.videoService.getAllAdminVideos(this.currentPage, this.pageSize, search).subscribe({
      next: (response: any) => {
        this.pageVideos = response.content;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.currentPage = response.number;
        this.hasMoreVideos = this.currentPage < this.totalPages - 1;
        // this.data.data = this.pageVideos;
        this.loading = false;

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.errorHandlerService.handle(err, 'Failed to load more video');
      },
    });
  }

  loadMoreVideos() {
    if (this.loadingMore || !this.hasMoreVideos) return;

    this.loadingMore = true;
    const nextPage = this.currentPage + 1;
    const search = this.searchQuery.trim() || undefined;

    this.videoService.getAllAdminVideos(nextPage, this.pageSize, search).subscribe({
      next: (response: any) => {
        this.pageVideos = [...this.pageVideos, ...response.content];
        this.currentPage = response.number;
        this.hasMoreVideos = this.currentPage < this.totalPages - 1;
        this.loadingMore = false;

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadingMore = false;
        this.errorHandlerService.handle(err, 'Failed to load more video');

        this.cdr.detectChanges();
      },
    });
  }

  loadStats() {
    this.videoService.getStatsByAdmin().subscribe((stats: any) => {
      this.totalVideos = stats.totalVideos;
      this.publishedVideos = stats.publishedVideos;
      this.totalDurationSeconds = stats.totalDuration;
    });
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;
    this.currentPage = 0;
    this.load();
  }

  clearSearch() {
    this.searchQuery = '';
    this.currentPage = 0;
    this.load();
  }

  play(video: any) {
    this.dialogService.openVideoPlayer(video);
  }

  createNew() {
    const dialogRef = this.dialogService.openVideoFormDialog('create');
    dialogRef.afterClosed().subscribe((response) => {
      if (response) {
        this.load();
        this.loadStats();
        this.cdr.detectChanges();
      }
    });
  }

  edit(video: any) {
    const dialogRef = this.dialogService.openVideoFormDialog('edit', video);

    dialogRef.afterClosed().subscribe((updatedData) => {
      // ถ้ากด Save (มีก้อนข้อมูล formData ส่งกลับมา)
      if (updatedData) {
        // นำข้อมูลใหม่ที่เพิ่งแก้ มาสวมทับตัวแปร video เดิมบนหน้าจอ (UI เปลี่ยนทันที!)
        Object.assign(video, updatedData);

        // โหลดแค่สถิติใหม่ (เผื่อว่ามีการติ๊กเปลี่ยนสถานะ Published)
        this.loadStats();

        // บังคับให้ UI วาดตัวเองใหม่
        this.cdr.detectChanges();
      }
    });
  }

  remove(video: any) {
    this.dialogService
      .openConfirmation(
        'Delete Video?',
        `Are you sure you want to delete "${video.title}"? This action cannot be undone`,
        'Delete',
        'Cancel',
        'danger',
      )
      .subscribe((response) => {
        if (response) {
          this.loading = true;
          this.videoService.deleteVideoByAdmin(video.id).subscribe({
            next: () => {
              (this, this.notification.success('Video delete successfully!'));
              this.load();
              this.loadStats();

              this.cdr.detectChanges();
            },
            error: (err) => {
              this.loading = false;
              this.errorHandlerService.handle(err, 'Failed to delete video, Please try again.');

              this.cdr.detectChanges();
            },
          });
        }
      });
  }

  togglePublish(event: any, video: any) {
    const newPublishedState = event.checked;

    // --- 1. ป้องกันการกดรัวๆ (Spam Click) ---
    if (video.isPublishing) {
      event.source.checked = !newPublishedState; // คืนค่าสวิตช์ถ้ากำลังโหลดอยู่
      return;
    }

    // ล็อกสวิตช์ของวิดีโอตัวนี้ไว้
    video.isPublishing = true;

    // --- 2. Optimistic UI: อัปเดตข้อมูลบนหน้าเว็บทันทีให้ดูลื่นไหล ---
    video.published = newPublishedState;

    this.videoService.setPublishedByAdmin(video.id, newPublishedState).subscribe({
      next: (response) => {
        // สำเร็จ: ปลดล็อกปุ่ม
        video.isPublishing = false;

        this.notification.success(
          `Video ${video.published ? 'published' : 'unpublished'} successfully`,
        );
        this.loadStats();
      },
      error: (err) => {
        // ไม่สำเร็จ: คืนค่าเดิมให้หน้าจอ และปลดล็อกปุ่ม
        video.published = !newPublishedState;
        video.isPublishing = false;

        // บังคับให้สวิตช์บนหน้าจอกลับไปอยู่ตำแหน่งเดิม
        if (event.source) {
          event.source.checked = video.published;
        }

        this.errorHandlerService.handle(err, 'Failed to update publish status, Please try again.');
      },
    });
  }

  getPublihedCount(): number {
    return this.publishedVideos;
  }

  getTotalDuration(): string {
    const total = this.totalDurationSeconds;

    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = Math.floor(total % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
  }
  formatDuration(seconds: number): string {
    return this.utilityService.formatDuration(seconds);
  }

  getPosterUrl(video: any) {
    return this.mediaService.getMediaUrl(video, 'image', { useCache: true });
  }
}
