import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Landing } from './landing/landing';
import { SharedModule } from './shared/shared-module';
import { Signup } from './signup/signup';

@NgModule({
  declarations: [App, Landing, Signup],
  imports: [BrowserModule, AppRoutingModule, SharedModule],
  providers: [provideBrowserGlobalErrorListeners()],
  bootstrap: [App],
})
export class AppModule {}
