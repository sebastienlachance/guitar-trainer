import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withAutoCleanupInjectors, withHashLocation } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Hash URLs (#/triads) work from static hosting and desktop or mobile wrappers without
    // server rewrite rules.
    // Leaving a module destroys its services, which stops anything they left running, such as a
    // calibration's metronome or a listener's effects.
    provideRouter(routes, withHashLocation(), withAutoCleanupInjectors()),
    // Caches the app for offline use and makes it installable. Production builds only: in
    // development it would keep serving stale files.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
