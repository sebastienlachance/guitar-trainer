import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { keepScreenAwake } from './keep-awake';

/** A stand-in for the Screen Wake Lock API: the locks held, and the page's visibility. */
function fakeWakeLock() {
  const held = new Set<object>();
  const request = vi.fn(async () => {
    const lock = { release: vi.fn(async () => void held.delete(lock)) };
    held.add(lock);
    return lock;
  });
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  const setVisible = (visible: boolean) => {
    Object.defineProperty(document, 'visibilityState', {
      value: visible ? 'visible' : 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  };
  return { held, request, setVisible };
}

/** Lets a granted lock arrive. */
async function settle(): Promise<void> {
  TestBed.tick();
  await Promise.resolve();
  await Promise.resolve();
}

describe('keepScreenAwake', () => {
  afterEach(() => {
    Object.defineProperty(navigator, 'wakeLock', { value: undefined, configurable: true });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  it('holds the screen on while active, and lets it go after', async () => {
    const { held, request } = fakeWakeLock();
    const active = signal(false);
    TestBed.runInInjectionContext(() => keepScreenAwake(active));
    await settle();
    expect(request).not.toHaveBeenCalled();

    active.set(true);
    await settle();
    expect(request).toHaveBeenCalledWith('screen');
    expect(held.size).toBe(1);

    active.set(false);
    await settle();
    expect(held.size).toBe(0);
  });

  it('asks again when the page comes back into view', async () => {
    const { held, request, setVisible } = fakeWakeLock();
    TestBed.runInInjectionContext(() => keepScreenAwake(signal(true)));
    await settle();

    // Browsers let go of the lock themselves while the page is hidden.
    setVisible(false);
    await settle();
    held.clear();
    setVisible(true);
    await settle();

    expect(request).toHaveBeenCalledTimes(2);
    expect(held.size).toBe(1);
  });
});
