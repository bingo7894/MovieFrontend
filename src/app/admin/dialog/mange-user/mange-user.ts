import { ChangeDetectorRef, Component, ErrorHandler, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../../user-service';
import { NotificationService } from '../../../shared/services/notification-service';
import { ErrorHandlerService } from '../../../shared/services/error-handler-service';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-mange-user',
  standalone: false,
  templateUrl: './mange-user.html',
  styleUrl: './mange-user.css',
})
export class MangeUser {
  userForm!: FormGroup;
  creating = false;
  hidePassword = true;
  isEditMode: boolean = false;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private notification: NotificationService,
    private errorHandlerService: ErrorHandlerService,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<MangeUser>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.isEditMode = data.mode === 'edit';

    this.userForm = this.fb.group({
      fullName: [data.user?.fullName || '', Validators.required],
      email: [data.user?.email || '', Validators.required],
      password: ['', this.isEditMode ? [] : [Validators.required, Validators.minLength(6)]],
      role: [data.user?.role || 'USER', Validators.required],
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSave() {
    this.creating = true;
    const formData = this.userForm.value;

    const data = {
      email: formData.email?.trim().toLowerCase(),
      password: formData.password,
      fullname: formData.fullName,
      role: formData.role,
    };

    const op$ = this.isEditMode
      ? this.userService.updateUser(this.data.user.id, data)
      : this.userService.createUser(data);

    op$.subscribe({
      next: (response: any) => {
        this.creating = false;
        this.notification.success(response?.message);
        this.dialogRef.close(true);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.creating = false;
        this.errorHandlerService.handle(err, 'Failed to save user');
        this.cdr.detectChanges();
      },
    });
  }
}
