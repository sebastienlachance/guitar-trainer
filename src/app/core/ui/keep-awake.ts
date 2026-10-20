import { DestroyRef, Signal, effect, inject, signal } from '@angular/core';

/**
 * Keeps the screen on while `active` is true: you play without touching the phone, which would
 * otherwise lock after a minute and stop the microphone. Browsers let go of the lock when the page
 * is hidden; it is asked for again on return. Does nothing where the browser can't.
 * Call it from a component's or service's constructor.
 */
export function keepScreenAwake(active: Signal<boolean>): void {
  const wakeLock = typeof navigator === 'undefined' ? undefined : navigator.wakeLock;
  if (!wakeLock) {
    return;
  }
  const visible = signal(document.visibilityState === 'visible');
  const onVisibilityChange = () => visible.set(document.visibilityState === 'visible');
  document.addEventListener('visibilitychange', onVisibilityChange);
  inject(DestroyRef).onDestroy(() =>
    document.removeEventListener('visibilitychange', onVisibilityChange),
  );

  effect((onCleanup) => {
    if (!active() || !visible()) {
      return;
    }
    let lock: WakeLockSentinel | null = null;
    let released = false;
    wakeLock.request('screen').then(
      (granted) => {
        if (released) {
          void granted.release();
        } else {
          lock = granted;
        }
      },
      () => {
        // Refused, as in battery saver mode: the screen locks as it usually would.
      },
    );
    onCleanup(() => {
      released = true;
      void lock?.release();
    });
  });
}
