import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminRoutingModule } from './admin-routing-module';
import { SharedModule } from '../shared/shared-module';
import { UserList } from './user-list/user-list';
import { MangeUser } from './dialog/mange-user/mange-user';
import { CourseList } from './course-list/course-list';
import { CourseCurriculum } from './course-curriculum/course-curriculum';
import { ManageCourse } from './dialog/manage-course/manage-course';
import { ManageTopic } from './dialog/manage-topic/manage-topic';
import { ManageEpisode } from './dialog/manage-episode/manage-episode';
import { QuizBuilder } from './dialog/quiz-builder/quiz-builder';

@NgModule({
  declarations: [
    UserList,
    MangeUser,
    CourseList,
    CourseCurriculum,
    ManageCourse,
    ManageTopic,
    ManageEpisode,
    QuizBuilder,
  ],
  imports: [CommonModule, AdminRoutingModule, SharedModule],
})
export class AdminModule {}
