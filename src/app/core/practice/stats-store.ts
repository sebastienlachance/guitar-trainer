import { Signal, signal } from '@angular/core';
import { PracticeResult, StatsByCard, isStatsByCard, recordResult } from './stats';
import { loadJson, saveJson } from './storage';

/** Per-card practice statistics for one module, kept in a signal and saved on every change. */
export class StatsStore {
  private readonly state = signal<StatsByCard>({});
  readonly stats: Signal<StatsByCard> = this.state.asReadonly();

  constructor(private readonly storageKey: string) {
    const saved = loadJson(storageKey);
    this.state.set(isStatsByCard(saved) ? saved : {});
  }

  record(cardKey: string, result: PracticeResult): void {
    this.state.update((stats) => recordResult(stats, cardKey, result));
    saveJson(this.storageKey, this.state());
  }

  reset(): void {
    this.state.set({});
    saveJson(this.storageKey, {});
  }
}
