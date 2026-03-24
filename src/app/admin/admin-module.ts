import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminRoutingModule } from './admin-routing-module';
import { ManageVideo } from './dialog/manage-video/manage-video';
import { VideoList } from './video-list/video-list';
import { SharedModule } from '../shared/shared-module';

@NgModule({
  declarations: [ManageVideo, VideoList],
  imports: [CommonModule, AdminRoutingModule, SharedModule],
})
export class AdminModule {}
