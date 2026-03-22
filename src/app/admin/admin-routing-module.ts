import { Component, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Header } from '../shared/components/header/header';

const routes: Routes = [{ path: '', component: Header }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
