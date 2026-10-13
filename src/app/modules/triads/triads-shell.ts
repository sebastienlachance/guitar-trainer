import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { accuracy, totals } from '../../core/practice/stats';
import { Icon } from '../../core/ui/icon';
import { TriadsSession } from './triads-session';

@Component({
  selector: 'app-triads-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  template: `
    <header class="bar">
      <a routerLink="/" class="brand">
        <app-icon name="pick" class="pick" />
        Guitar trainer <span class="separator" aria-hidden="true">/</span>
        <span class="module">Triads</span>
      </a>
      <nav aria-label="Triads">
        @if (summary(); as s) {
          <span class="summary muted">{{ s }}</span>
        }
        <a routerLink="practice" routerLinkActive="active" class="nav-link" aria-label="Practice">
          <app-icon name="play" />
        </a>
        <a routerLink="stats" routerLinkActive="active" class="nav-link" aria-label="Stats">
          <app-icon name="chart" />
        </a>
        <a
          routerLink="."
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          class="nav-link"
          aria-label="Setup"
        >
          <app-icon name="sliders" />
        </a>
      </nav>
    </header>
    <router-outlet />
  `,
  styles: `
    :host {
      display: block;
    }
    .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
      font-size: 14px;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--text-muted);
      text-decoration: none;
    }
    .pick {
      color: var(--accent);
    }
    .separator {
      color: var(--border-strong);
    }
    .module {
      color: var(--text);
    }
    nav {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .summary {
      margin-right: 8px;
    }
    .nav-link {
      display: inline-flex;
      padding: 10px;
      border-radius: var(--radius);
      color: var(--text-muted);
    }
    .nav-link:hover,
    .nav-link.active {
      color: var(--text);
      background: var(--control);
    }
    @media (max-width: 480px) {
      .summary {
        display: none;
      }
    }
  `,
})
export class TriadsShell {
  private readonly session = inject(TriadsSession);

  /** E.g. "82% · 23 cards", or nothing before the first answer. */
  protected readonly summary = computed(() => {
    const stats = this.session.stats();
    const overall = totals(stats);
    if (overall.attempts === 0) {
      return null;
    }
    const cards = Object.keys(stats).length;
    return `${Math.round(accuracy(overall) * 100)}% · ${cards} ${cards === 1 ? 'card' : 'cards'}`;
  });
}
