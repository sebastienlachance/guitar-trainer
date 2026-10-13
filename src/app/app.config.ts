import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Hash URLs (#/triads) work from static hosting and desktop or mobile wrappers without
    // server rewrite rules.
    provideRouter(routes, withHashLocation()),
  ],
};
