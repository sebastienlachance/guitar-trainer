import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Drill } from '../practice/drill';
import { accuracy, totals } from '../practice/stats';
import { Icon } from './icon';
import { plural } from './text';
import { TopBar } from './top-bar';

/** Top bar and pages of a practice module: setup at the module root, practice and stats below. */
@Component({
  selector: 'app-module-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, TopBar],
  template: `
    <app-top-bar [title]="title">
      <nav [attr.aria-label]="title">
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
    </app-top-bar>
    <router-outlet />
  `,
  styles: `
    :host {
      display: block;
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
export class ModuleShell {
  private readonly drill = inject(Drill);
  protected readonly title = this.drill.title;

  /** E.g. "82% · 23 cards", or nothing before the first answer. */
  protected readonly summary = computed(() => {
    const stats = this.drill.run.stats();
    const overall = totals(stats);
    if (overall.attempts === 0) {
      return null;
    }
    return `${Math.round(accuracy(overall) * 100)}% · ${plural(Object.keys(stats).length, 'card')}`;
  });
}
