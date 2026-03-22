import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Landing } from './landing/landing';
import { SharedModule } from './shared/shared-module';
import { Signup } from './signup/signup';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Login } from './login/login';
import { VerfyEmail } from './verfy-email/verfy-email';
import { Home } from './user/home/home';
import { authInterceptor } from './shared/interceptors/auth-interceptor';

@NgModule({
  declarations: [App, Landing, Signup, Login, VerfyEmail, Home],
  imports: [BrowserModule, AppRoutingModule, SharedModule],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
  bootstrap: [App],
})
export class AppModule {}
