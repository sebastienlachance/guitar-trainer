import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { Home } from './home';

describe('Home', () => {
  it('links to every practice module', async () => {
    await render(Home, { providers: [provideRouter([])] });

    expect(screen.getByRole('link', { name: /Triads/ })).toHaveAttribute('href', '/triads');
    expect(screen.getByRole('link', { name: /Fretboard notes/ })).toHaveAttribute('href', '/notes');
    expect(screen.getByRole('link', { name: /Identify notes/ })).toHaveAttribute(
      'href',
      '/identify',
    );
    expect(screen.getByRole('link', { name: /Identify scales/ })).toHaveAttribute(
      'href',
      '/scales',
    );
  });
});
