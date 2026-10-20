import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from './icon';

/** The bar at the top of a page below home: a way back home, the page's name, then its links. */
@Component({
  selector: 'app-top-bar',
  imports: [RouterLink, Icon],
  template: `
    <header class="bar">
      <div class="brand">
        <a routerLink="/" class="home" aria-label="Guitar trainer home">
          <app-icon name="pick" class="pick" />
          <span class="app-name">Guitar trainer</span>
        </a>
        <span class="separator" aria-hidden="true">/</span>
        <span class="title">{{ title() }}</span>
      </div>
      <ng-content />
    </header>
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
    }
    .home {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 0;
      color: inherit;
      text-decoration: none;
    }
    .pick {
      color: var(--accent);
    }
    .separator {
      color: var(--border-strong);
    }
    .title {
      color: var(--text);
      white-space: nowrap;
    }
    @media (max-width: 480px) {
      .app-name,
      .separator {
        display: none;
      }
    }
  `,
})
export class TopBar {
  readonly title = input.required<string>();
}
