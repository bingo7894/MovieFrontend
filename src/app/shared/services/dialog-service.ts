import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ChangePasswordDialog } from '../components/change-password-dialog/change-password-dialog';
import { DIALOG_CONFIG } from '../constants/app.constants';
import { Observable } from 'rxjs';
import { ConfirmDialog } from '../components/confirm-dialog/confirm-dialog';
import { ManageVideo } from '../../admin/dialog/manage-video/manage-video';
import { VideoPlayer } from '../components/video-player/video-player';
import { DialogConfig } from '@angular/cdk/dialog';
import { MangeUser } from '../../admin/dialog/mange-user/mange-user';

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  constructor(private dialog: MatDialog) {}

  openChangePasswordDialog(): MatDialogRef<ChangePasswordDialog> {
    return this.dialog.open(ChangePasswordDialog, DIALOG_CONFIG.CHANGE_PASSWORD);
  }

  openConfirmation(
    title: string,
    message: string,
    confirmText: string = 'Confirm',
    cancelText: string = 'Cancel',
    type: 'warning' | 'danger' | 'info' = 'warning',
  ): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      ...DIALOG_CONFIG.CONFIRM,
      data: {
        title,
        message,
        confirmText,
        cancelText,
        type,
      },
    });

    return dialogRef.afterClosed();
  }

  openVideoFormDialog(mode: 'create' | 'edit', video?: any): MatDialogRef<ManageVideo> {
    return this.dialog.open(ManageVideo, {
      ...DIALOG_CONFIG.VIDEO_FORM,
      data: { mode, video },
    });
  }

  openVideoPlayer(video: any): MatDialogRef<VideoPlayer> {
    return this.dialog.open(VideoPlayer, {
      data: video,
      ...DIALOG_CONFIG.VIDEO_PLAYER,
    });
  }

  openManageUserDialog(mode: 'create' | 'edit', user?: any): MatDialogRef<MangeUser> {
    return this.dialog.open(MangeUser, {
      ...DIALOG_CONFIG.MANAGE_USER,
      data: { mode, user },
    });
  }
}
