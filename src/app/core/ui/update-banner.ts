import { Component, DOCUMENT, InjectionToken, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { filter, map, merge } from 'rxjs';

/** Reloads the page. A token so tests can replace it: jsdom can't reload. */
export const RELOAD_PAGE = new InjectionToken<() => void>('RELOAD_PAGE', {
  factory: () => {
    const document = inject(DOCUMENT);
    return () => document.location.reload();
  },
});

type UpdateState = 'current' | 'ready' | 'broken';

/**
 * Offers a reload when the service worker has downloaded a new version of the app, or when the
 * cached version can't load some of its files any more. It never reloads by itself: the user may
 * be in the middle of a question. A reload mid-session is safe, since `PracticeLog` recovers the
 * open session.
 */
@Component({
  selector: 'app-update-banner',
  template: `
    <div role="status">
      @if (state() !== 'current') {
        <div class="panel banner">
          <span>
            @if (state() === 'ready') {
              A new version is ready.
            } @else {
              Part of this version is no longer available.
            }
          </span>
          <button type="button" class="btn btn-primary" (click)="reload()">Reload</button>
        </div>
      }
    </div>
  `,
  styles: `
    .banner {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
      padding: 10px 12px 10px 18px;
      border-color: var(--accent);
    }
  `,
})
export class UpdateBanner {
  private readonly updates = inject(SwUpdate);
  protected readonly reload = inject(RELOAD_PAGE);

  protected readonly state = toSignal<UpdateState, UpdateState>(
    merge(
      this.updates.versionUpdates.pipe(
        filter((event) => event.type === 'VERSION_READY'),
        map(() => 'ready' as const),
      ),
      this.updates.unrecoverable.pipe(map(() => 'broken' as const)),
    ),
    { initialValue: 'current' },
  );
}
