import { Component, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Header } from '../shared/components/header/header';
import { VideoList } from './video-list/video-list';

const routes: Routes = [
  {
    path: '',
    component: Header,
    children: [
      { path: '', redirectTo: 'video', pathMatch: 'full' },
      { path: 'videos', component: VideoList },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
