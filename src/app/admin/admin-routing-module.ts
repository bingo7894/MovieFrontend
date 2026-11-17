import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Header } from '../shared/components/header/header';
import { UserList } from './user-list/user-list';
import { CourseList } from './course-list/course-list';
import { CourseCurriculum } from './course-curriculum/course-curriculum';

const routes: Routes = [
  {
    path: '',
    component: Header,
    children: [
      { path: '', redirectTo: 'courses', pathMatch: 'full' },
      { path: 'courses', component: CourseList },
      { path: 'courses/:id/curriculum', component: CourseCurriculum },
      { path: 'users', component: UserList },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
