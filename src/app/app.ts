import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UpdateBanner } from './core/ui/update-banner';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UpdateBanner],
  template: `
    <main>
      <app-update-banner />
      <router-outlet />
    </main>
  `,
  styles: `
    main {
      max-width: 760px;
      margin: 0 auto;
      padding: 16px 16px 48px;
    }
  `,
})
export class App {}
