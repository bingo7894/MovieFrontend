import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Landing } from './landing/landing';
import { Signup } from './signup/signup';

const routes: Routes = [
  { path: '', component: Landing },
  { path: 'signup', component: Signup },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
