import { SwUpdate, UnrecoverableStateEvent, VersionEvent } from '@angular/service-worker';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Subject } from 'rxjs';
import { RELOAD_PAGE, UpdateBanner } from './update-banner';

async function renderBanner() {
  const versionUpdates = new Subject<VersionEvent>();
  const unrecoverable = new Subject<UnrecoverableStateEvent>();
  const reload = vi.fn();
  await render(UpdateBanner, {
    providers: [
      { provide: SwUpdate, useValue: { versionUpdates, unrecoverable } },
      { provide: RELOAD_PAGE, useValue: reload },
    ],
  });
  return { versionUpdates, unrecoverable, reload };
}

describe('UpdateBanner', () => {
  it('stays quiet while a new version is only being downloaded', async () => {
    const { versionUpdates } = await renderBanner();

    versionUpdates.next({ type: 'VERSION_DETECTED', version: { hash: 'new' } });

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('offers a reload once a new version is ready', async () => {
    const user = userEvent.setup();
    const { versionUpdates, reload } = await renderBanner();

    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old' },
      latestVersion: { hash: 'new' },
    });
    await user.click(await screen.findByRole('button', { name: 'Reload' }));

    expect(screen.getByRole('status')).toHaveTextContent('A new version is ready.');
    expect(reload).toHaveBeenCalledOnce();
  });

  it('offers a reload when the cached version is broken', async () => {
    const { unrecoverable } = await renderBanner();

    unrecoverable.next({ type: 'UNRECOVERABLE_STATE', reason: 'missing files' });

    expect(await screen.findByRole('button', { name: 'Reload' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('no longer available');
  });
});
