import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ChangePasswordDialog } from '../components/change-password-dialog/change-password-dialog';
import { DIALOG_CONFIG } from '../constants/app.constants';
import { Observable } from 'rxjs';
import { ConfirmDialog } from '../components/confirm-dialog/confirm-dialog';
import { MangeUser } from '../../admin/dialog/mange-user/mange-user';
import { ManageCourse } from '../../admin/dialog/manage-course/manage-course';
import { ManageTopic } from '../../admin/dialog/manage-topic/manage-topic';
import { ManageEpisode } from '../../admin/dialog/manage-episode/manage-episode';
import { QuizBuilder } from '../../admin/dialog/quiz-builder/quiz-builder';

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
      data: { title, message, confirmText, cancelText, type },
    });
    return dialogRef.afterClosed();
  }

  openManageUserDialog(mode: 'create' | 'edit', user?: any): MatDialogRef<MangeUser> {
    return this.dialog.open(MangeUser, {
      ...DIALOG_CONFIG.MANAGE_USER,
      data: { mode, user },
    });
  }

  openCourseFormDialog(mode: 'create' | 'edit', course?: any): MatDialogRef<ManageCourse> {
    return this.dialog.open(ManageCourse, {
      ...DIALOG_CONFIG.COURSE_FORM,
      data: { mode, course },
    });
  }

  openTopicFormDialog(
    mode: 'create' | 'edit',
    courseId: number,
    topic?: any,
    nextOrder?: number,
  ): MatDialogRef<ManageTopic> {
    return this.dialog.open(ManageTopic, {
      ...DIALOG_CONFIG.TOPIC_FORM,
      data: { mode, courseId, topic, nextOrder },
    });
  }

  openEpisodeFormDialog(
    mode: 'create' | 'edit',
    topicId: number,
    episode?: any,
    nextEpisodeNumber?: number,
  ): MatDialogRef<ManageEpisode> {
    return this.dialog.open(ManageEpisode, {
      ...DIALOG_CONFIG.EPISODE_FORM,
      data: { mode, topicId, episode, nextEpisodeNumber },
    });
  }

  openQuizBuilderDialog(episodeId: number, quizId?: number): MatDialogRef<QuizBuilder> {
    return this.dialog.open(QuizBuilder, {
      ...DIALOG_CONFIG.QUIZ_BUILDER,
      data: { episodeId, quizId },
    });
  }
}
