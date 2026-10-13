import { Component, inject, signal } from '@angular/core';
import { Drill } from '../../practice/drill';

/** Clears a module's per-card stats after a confirmation step. Session history is kept. */
@Component({
  selector: 'app-reset-stats',
  template: `
    @if (confirming()) {
      <span class="muted" role="status">This clears every answer. It can't be undone.</span>
      <button type="button" class="btn" (click)="confirming.set(false)">Cancel</button>
    }
    <button type="button" class="btn btn-danger" (click)="reset()">
      {{ confirming() ? 'Clear stats' : 'Reset stats' }}
    </button>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      flex-wrap: wrap;
    }
  `,
})
export class ResetStats {
  private readonly run = inject(Drill).run;
  protected readonly confirming = signal(false);

  protected reset(): void {
    if (this.confirming()) {
      this.run.resetStats();
      this.confirming.set(false);
    } else {
      this.confirming.set(true);
    }
  }
}
