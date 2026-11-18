import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { debounceTime, distinctUntilChanged, finalize, Subject } from 'rxjs';
import { UserService } from '../../user-service';
import { AuthService } from '../../shared/services/auth-service';
import { DialogService } from '../../shared/services/dialog-service';
import { NotificationService } from '../../shared/services/notification-service';
import { ErrorHandlerService } from '../../shared/services/error-handler-service';

@Component({
  selector: 'app-user-list',
  standalone: false,
  templateUrl: './user-list.html',
  styleUrl: './user-list.css',
})
export class UserList implements OnInit, OnDestroy {
  paginatedUsers: any[] = [];
  loading = true;
  refreshing = false;
  loadingMore = false;
  error = false;
  currentUserEmail: string | null = null;
  searchQuery = '';

  pageSize = 10;
  currentPage = 0;
  totalPages = 0;
  totalUsers = 0;
  hasMoreUsers = true;

  private searchSubject = new Subject<string>();

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private dialogService: DialogService,
    private notification: NotificationService,
    private errorHandlerService: ErrorHandlerService,
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    this.currentUserEmail = currentUser?.email || null;
    this.loadUsers();
    this.searchSubject.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => {
      this.loadUsers();
    });
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const scrollPosition = window.pageYOffset + window.innerHeight;
    const pageHeight = document.documentElement.scrollHeight;

    if (
      scrollPosition >= pageHeight - 200 &&
      !this.loadingMore &&
      !this.loading &&
      !this.refreshing &&
      this.hasMoreUsers
    ) {
      this.loadMoreUsers();
    }
  }

  loadUsers(): void {
    this.error = false;
    this.currentPage = 0;
    if (this.paginatedUsers.length === 0) {
      this.loading = true;
    } else {
      this.refreshing = true;
    }

    const search = this.searchQuery.trim() || undefined;

    this.userService
      .getAllUsers(0, this.pageSize, search)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.refreshing = false;
        }),
      )
      .subscribe({
        next: (response: any) => {
          this.paginatedUsers = response.content || [];
          this.totalUsers = response.totalElements || 0;
          this.totalPages = response.totalPages || 0;
          this.currentPage = response.number || 0;
          this.hasMoreUsers = this.currentPage < this.totalPages - 1;
        },
        error: (err) => {
          if (this.paginatedUsers.length === 0) this.error = true;
          this.errorHandlerService.handle(err, 'Failed to load users');
        },
      });
  }

  loadMoreUsers(): void {
    if (this.loadingMore || !this.hasMoreUsers) return;
    this.loadingMore = true;
    const nextPage = this.currentPage + 1;
    const search = this.searchQuery.trim() || undefined;

    this.userService
      .getAllUsers(nextPage, this.pageSize, search)
      .pipe(finalize(() => (this.loadingMore = false)))
      .subscribe({
        next: (response: any) => {
          this.paginatedUsers = [...this.paginatedUsers, ...(response.content || [])];
          this.currentPage = response.number;
          this.hasMoreUsers = this.currentPage < this.totalPages - 1;
        },
        error: (err) => {
          this.errorHandlerService.handle(err, 'Failed to load more users');
        },
      });
  }

  onSearchChange(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value;
    this.searchSubject.next(this.searchQuery);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.loadUsers();
  }

  createUser(): void {
    this.dialogService
      .openManageUserDialog('create')
      .afterClosed()
      .subscribe((response) => {
        if (response) {
          this.loadUsers();
        }
      });
  }

  editUser(user: any): void {
    this.dialogService
      .openManageUserDialog('edit', user)
      .afterClosed()
      .subscribe((response) => {
        if (response) {
          this.loadUsers();
        }
      });
  }

  isCurrentUser(user: any): boolean {
    return user.email === this.currentUserEmail;
  }

  toggleUserStatus(user: any): void {
    this.userService.toggleUserStatus(user.id).subscribe({
      next: (response: any) => {
        user.active = !user.active;
        this.notification.success(response.message);
      },
      error: (err) => {
        this.errorHandlerService.handle(err, 'Failed to update user status');
      },
    });
  }

  deleteUser(user: any): void {
    this.dialogService
      .openConfirmation(
        'Delete User',
        `Are you sure you want to delete user ${user.fullName || user.email}? This action cannot be undone.`,
        'Delete',
        'Cancel',
        'danger',
      )
      .subscribe((response) => {
        if (response) {
          this.userService.deleteUser(user.id).subscribe({
            next: (res: any) => {
              this.notification.success(res?.message || 'User deleted successfully');
              this.paginatedUsers = this.paginatedUsers.filter((u) => u.id !== user.id);
              this.totalUsers = Math.max(0, this.totalUsers - 1);
            },
            error: (err) => {
              this.errorHandlerService.handle(err, 'Failed to delete user');
            },
          });
        }
      });
  }

  changeUserRole(user: any): void {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';

    this.dialogService
      .openConfirmation(
        'Change User Role?',
        `Are you sure you want to change ${user.fullName || user.email}'s role to ${newRole}?`,
        'Change Role',
        'Cancel',
        'warning',
      )
      .subscribe((response) => {
        if (response) {
          this.userService.changeUserRole(user.id, newRole).subscribe({
            next: (res: any) => {
              user.role = newRole;
              this.notification.success(res?.message || 'Role updated successfully');
            },
            error: (err) => {
              this.errorHandlerService.handle(err, 'Failed to change user role.');
            },
          });
        }
      });
  }

  getRoleBadgeClass(role: string): string {
    return role === 'ADMIN' ? 'role-badge admin' : 'role-badge user';
  }

  getStatusBadgeClass(active: boolean | string): string {
    return active ? 'status-badge active' : 'status-badge inactive';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
