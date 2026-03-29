import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { debounceTime, distinctUntilChanged, scan, Subject } from 'rxjs';
import { VideoService } from '../../shared/services/video-service';
import { WatchlistService } from '../../shared/services/watchlist-service';
import { NotificationService } from '../../shared/services/notification-service';
import { UtilityService } from '../../shared/services/utility-service';
import { MediaService } from '../../shared/services/media-service';
import { DialogService } from '../../shared/services/dialog-service';
import { ErrorHandlerService } from '../../shared/services/error-handler-service';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, OnDestroy {
  allVideos: any = [];
  filteredVideos: any = [];
  loading = true;
  loadingMore = false;
  error = false;
  searchQuery: string = '';

  featuredVideos: any[] = [];
  currentSlideIndex = 0;
  featuredLoading = true;

  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  hasMoreVideos = true;

  private searchSubject = new Subject<String>();
  private sliderInterval: any;
  private saveScrollPosition: number = 0;

  constructor(
    private videoSerive: VideoService,
    private watchlistService: WatchlistService,
    private notification: NotificationService,
    public utilityService: UtilityService,
    public mediaService: MediaService,
    private dialogService: DialogService,
    private errorHandlerService: ErrorHandlerService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadFeaturedVideos();
    this.loadVideos();
    this.initializeSearchDebounce();
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
    this.stopSlider();
  }

  initializeSearchDebounce(): void {
    this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe(() => {
      this.preformSearch();
    });
  }

  loadFeaturedVideos() {
    this.featuredLoading = true;
    this.videoSerive.getFratureVideo().subscribe({
      next: (videos: any) => {
        this.featuredVideos = videos;
        this.featuredLoading = false;
        if (this.featuredVideos.length > 1) {
          this.startSlider();
        }
        this.cdr.detectChanges(); // อัปเดต UI เมื่อโหลด Featured Videos เสร็จ
      },
      error: (err) => {
        this.featuredLoading = false;
        this.errorHandlerService.handle(err, 'Error loading featured videos');
        this.cdr.detectChanges(); // อัปเดต UI เมื่อเกิด Error
      },
    });
  }

  private startSlider() {
    this.sliderInterval = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  private stopSlider() {
    if (this.sliderInterval) {
      clearInterval(this.sliderInterval);
    }
  }

  nextSlide() {
    if (this.featuredVideos.length > 0) {
      this.currentSlideIndex = (this.currentSlideIndex + 1) % this.featuredVideos.length;
      this.cdr.detectChanges(); // อัปเดต UI เมื่อสไลด์เปลี่ยน
    }
  }

  prevSlide() {
    if (this.featuredVideos.length > 0) {
      this.currentSlideIndex =
        (this.currentSlideIndex - 1 + this.featuredVideos.length) % this.featuredVideos.length;
      this.cdr.detectChanges(); // อัปเดต UI เมื่อสไลด์เปลี่ยน
    }
  }

  goToSlide(index: number) {
    this.currentSlideIndex = index;
    this.stopSlider();
    if (this.featuredVideos.length > 1) {
      this.startSlider();
    }
    this.cdr.detectChanges(); // อัปเดต UI เมื่อผู้ใช้กดจุด Indicator เปลี่ยนสไลด์
  }

  getCurrentFeaturedVideo() {
    return this.featuredVideos[this.currentSlideIndex] || null;
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
    const search = this.searchQuery.trim() || undefined;
    const isSearching = !!search;
    this.loading = true;

    this.videoSerive.getPublishedVideoPaginated(page, this.pageSize, search).subscribe({
      next: (response: any) => {
        this.allVideos = response.content;
        this.filteredVideos = response.content;
        this.currentPage = response.number;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.hasMoreVideos = this.currentPage < this.totalPages - 1;
        this.loading = false;

        this.cdr.detectChanges(); // สั่งอัปเดต UI หน้าจอทันทีเมื่อได้ข้อมูลวิดีโอใหม่

        if (isSearching && this.saveScrollPosition > 0) {
          setTimeout(() => {
            window.scrollTo({
              top: this.saveScrollPosition,
              behavior: 'auto',
            });
            this.saveScrollPosition = 0;
          }, 0);
        }
      },
      error: (err) => {
        console.error('Error loading videos:', err);
        this.error = true;
        this.loading = false;
        this.saveScrollPosition = 0;
        this.cdr.detectChanges(); // อัปเดต UI เพื่อโชว์ข้อความ Error
      },
    });
  }

  loadMoreVideos() {
    if (this.loadingMore || !this.hasMoreVideos) return;
    this.loadingMore = true;
    const nextPage = this.currentPage + 1;
    const search = this.searchQuery.trim() || undefined;

    this.videoSerive.getPublishedVideoPaginated(nextPage, this.pageSize, search).subscribe({
      next: (response: any) => {
        this.allVideos = [...this.allVideos, ...response.content];
        this.filteredVideos = [...this.filteredVideos, ...response.content];
        this.currentPage = response.number;
        this.hasMoreVideos = this.currentPage < this.totalPages - 1;
        this.loadingMore = false;
        this.cdr.detectChanges(); // สั่งอัปเดต UI ให้วิดีโอใหม่ปรากฏต่อท้าย
      },
      error: (err) => {
        this.notification.error('Failed to load more video');
        this.loadingMore = false;
        this.cdr.detectChanges(); // อัปเดตสถานะ loadingMore
      },
    });
  }

  onSearch() {
    this.searchSubject.next(this.searchQuery);
  }

  private preformSearch() {
    this.saveScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    this.currentPage = 0;
    this.loadVideos();
  }

  clearSearch() {
    this.searchQuery = '';
    this.currentPage = 0;
    this.saveScrollPosition = 0;
    this.cdr.detectChanges(); // รีเซ็ตค่า Input ให้โล่งทันที
    this.loadVideos();
  }

  isInWatchlist(video: any): boolean {
    return video.isInWatchlist === true;
  }

  toggleWatchlist(video: any, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    const videoId = video.id;
    const isInList = this.isInWatchlist(video);

    if (isInList) {
      video.isInWatchlist = false;
      this.cdr.detectChanges(); // อัปเดตไอคอนหัวใจให้เปลี่ยนทันทีโดยไม่ต้องรอ API เพื่อประสบการณ์ที่ลื่นไหล (Optimistic Update)

      this.watchlistService.removeFromWatchlist(videoId).subscribe({
        next: () => {
          this.notification.success('Removed from My Favorites');
        },
        error: (err) => {
          video.isInWatchlist = true; // คืนค่ากลับถ้า API พัง
          this.cdr.detectChanges(); // อัปเดตไอคอนหัวใจกลับมาแสดงตามเดิม
          this.errorHandlerService.handle(
            err,
            'Failed to remove from My Favorites. Please try again.',
          );
        },
      });
    } else {
      video.isInWatchlist = true;
      this.cdr.detectChanges(); // อัปเดตไอคอนหัวใจให้เปลี่ยนทันที

      this.watchlistService.addToWatchlist(videoId).subscribe({
        next: () => {
          this.notification.success('Added to My Favorites');
        },
        error: (err) => {
          video.isInWatchlist = false; // คืนค่ากลับถ้า API พัง
          this.cdr.detectChanges(); // อัปเดตไอคอนหัวใจกลับมาแสดงตามเดิม
          this.errorHandlerService.handle(err, 'Failed to add to My Favorites. Please try again.');
        },
      });
    }
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
