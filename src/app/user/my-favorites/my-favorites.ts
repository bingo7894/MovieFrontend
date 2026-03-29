import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { VideoService } from '../../shared/services/video-service';
import { WatchlistService } from '../../shared/services/watchlist-service';
import { NotificationService } from '../../shared/services/notification-service';
import { UtilityService } from '../../shared/services/utility-service';
import { MediaService } from '../../shared/services/media-service';
import { ErrorHandlerService } from '../../shared/services/error-handler-service';
import { DialogService } from '../../shared/services/dialog-service';

@Component({
  selector: 'app-my-favorites',
  standalone: false,
  templateUrl: './my-favorites.html',
  styleUrl: './my-favorites.css',
})
export class MyFavorites implements OnInit, OnDestroy {
  allVideos: any = [];
  filteredVideos: any = [];
  loading = true;
  loadingMore = false;
  error = false;
  searchQuery: string = '';

  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  hasMoreVideos = true;

  private searchSubject = new Subject<string>();

  constructor(
    private videoService: VideoService, // แก้ไขชื่อตัวแปรให้ถูกต้อง
    private watchlistService: WatchlistService,
    private notification: NotificationService,
    public utilityService: UtilityService,
    public mediaService: MediaService,
    private dialogService: DialogService,
    private errorHandlerService: ErrorHandlerService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadVideos();
    this.initializeSearchDebounce();
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }

  initializeSearchDebounce(): void {
    this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe(() => {
      this.performSearch(); // แก้ไขชื่อที่พิมพ์ผิด
    });
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

  loadVideos(page: number = 0) {
    this.error = false;
    this.currentPage = 0;
    this.allVideos = [];
    this.filteredVideos = [];
    const search = this.searchQuery.trim();
    this.loading = true;

    this.watchlistService.getWatchlist(page, this.pageSize, search).subscribe({
      next: (response: any) => {
        this.allVideos = response.content;
        this.filteredVideos = response.content;
        this.currentPage = response.number;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.hasMoreVideos = this.currentPage < this.totalPages - 1;
        this.loading = false;

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading videos:', err);
        this.error = true;
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadMoreVideos() {
    if (this.loadingMore || !this.hasMoreVideos) return;
    this.loadingMore = true;
    const nextPage = this.currentPage + 1;
    const search = this.searchQuery.trim();

    this.watchlistService.getWatchlist(nextPage, this.pageSize, search).subscribe({
      next: (response: any) => {
        this.allVideos = [...this.allVideos, ...response.content];
        this.filteredVideos = [...this.filteredVideos, ...response.content];
        this.currentPage = response.number;
        this.hasMoreVideos = this.currentPage < this.totalPages - 1;
        this.loadingMore = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.notification.error('Failed to load more video');
        this.loadingMore = false;
        this.cdr.detectChanges();
      },
    });
  }

  onSearch() {
    this.searchSubject.next(this.searchQuery);
  }

  private performSearch() {
    this.currentPage = 0;
    this.loadVideos();
  }

  clearSearch() {
    this.searchQuery = '';
    this.currentPage = 0;
    this.cdr.detectChanges();
    this.loadVideos();
  }

  isInWatchlist(video: any): boolean {
    return video.isInWatchlist === true;
  }

  toggleWatchlist(video: any, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    const videoId = video.id!;

    this.watchlistService.removeFromWatchlist(videoId).subscribe({
      next: () => {
        this.allVideos = this.allVideos.filter((v: any) => v.id !== videoId);
        this.filteredVideos = this.filteredVideos.filter((v: any) => v.id !== videoId);

        this.notification.success('Removed from My Favorites'); // แก้ไขคำผิด

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorHandlerService.handle(err, 'Failed to remove from My Favorites.');
      },
    });
  }

  getPosterUrl(video: any) {
    return (
      this.mediaService.getMediaUrl(video, 'image', {
        useCache: true,
      }) || ''
    );
  }

  playVideo(video: any) {
    this.dialogService.openVideoPlayer(video);
  }

  formatDuration(seconds: number | undefined): string {
    return this.utilityService.formatDuration(seconds);
  }
}
