import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Drill } from '../../practice/drill';
import { plural } from '../text';

/** Foot of a setup page: what's missing or how many cards there are, and Start session. */
@Component({
  selector: 'app-setup-start',
  template: `
    @if (run.problems.length > 0) {
      <ul class="problems" role="status">
        @for (problem of run.problems; track problem) {
          <li>{{ problem }}</li>
        }
      </ul>
    } @else {
      <p class="muted" role="status">{{ cards() }}</p>
    }
    <button type="button" class="btn btn-primary" (click)="start()">Start session</button>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 16px;
      flex-wrap: wrap;
    }
    p {
      margin: 0;
    }
    .problems {
      margin: 0;
      padding-left: 18px;
      color: var(--warning);
      font-size: 14px;
    }
  `,
})
export class SetupStart {
  protected readonly run = inject(Drill).run;
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected cards(): string {
    return plural(this.run.deckSize, 'card');
  }

  /** Starts a session and opens the practice page next to this setup page. */
  protected start(): void {
    if (this.run.start()) {
      void this.router.navigate(['practice'], { relativeTo: this.route });
    }
  }
}
