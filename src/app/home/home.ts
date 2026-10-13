import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../core/ui/icon';
import { MODULES } from '../modules/registry';

@Component({
  selector: 'app-home',
  imports: [RouterLink, Icon],
  template: `
    <header>
      <h1><app-icon name="pick" class="pick" /> Guitar trainer</h1>
      <p class="muted">Pick something to practise.</p>
    </header>
    <ul class="modules">
      @for (module of modules; track module.path) {
        <li>
          <a class="panel module" [routerLink]="['/', module.path]">
            <span class="title">{{ module.title }}</span>
            <span class="muted">{{ module.description }}</span>
            <app-icon name="arrow-right" class="go" />
          </a>
        </li>
      }
    </ul>
  `,
  styles: `
    header {
      margin: 24px 0 20px;
    }
    h1 {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 26px;
    }
    .pick {
      color: var(--accent);
    }
    header p {
      margin: 6px 0 0;
    }
    .modules {
      display: grid;
      gap: 12px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .module {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 4px 16px;
      color: inherit;
      text-decoration: none;
    }
    .module:hover {
      border-color: var(--border-strong);
    }
    .title {
      font-size: 18px;
      font-weight: 500;
    }
    .go {
      grid-row: 1 / span 2;
      grid-column: 2;
      align-self: center;
      color: var(--accent);
    }
  `,
})
export class Home {
  protected readonly modules = MODULES;
}
