import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <main>
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
