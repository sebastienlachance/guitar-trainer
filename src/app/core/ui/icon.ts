import { Component, computed, input } from '@angular/core';

/** Outline icons drawn inline so the app needs no icon font or network access. */
const ICON_PATHS = {
  pick: 'M12 20.5c-3.8 -3.2 -8.5 -8.6 -8.5 -12.2c0 -2.6 3.8 -4.3 8.5 -4.3s8.5 1.7 8.5 4.3c0 3.6 -4.7 9 -8.5 12.2z',
  chart: 'M4 20h16M7 16v-4M12 16v-9M17 16v-6',
  sliders:
    'M4 6h9M17 6h3M13 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M4 12h3M11 12h9M7 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M4 18h11M19 18h1M15 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
  mic: 'M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1 -6 0zM5 10a7 7 0 0 0 14 0M12 17v4M8 21h8',
  check: 'M5 12l5 5l10 -10',
  x: 'M18 6l-12 12M6 6l12 12',
  'arrow-left': 'M5 12h14M5 12l6 6M5 12l6 -6',
  'arrow-right': 'M5 12h14M13 18l6 -6M13 6l6 6',
  'arrow-up': 'M12 19v-14M6 11l6 -6l6 6',
  'arrow-down': 'M12 5v14M6 13l6 6l6 -6',
  play: 'M7 4v16l13 -8z',
  pause: 'M7 5h3v14h-3zM14 5h3v14h-3z',
  clock: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0M12 7v5l3 3',
  // The modules and the tuner, on the home page.
  'tuning-fork': 'M9 3v7a3 3 0 0 0 6 0v-7M12 13v8M10 21h4',
  neck: 'M3 6h18M3 10h18M3 14h18M3 18h18M8 4v16M14 4v16M10 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
  'name-note':
    'M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7 .3 -1 .8 -1 1.5v.5M12 17v.01',
  'scale-shape':
    'M4.6 7a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0 -2.8 0M10.6 7a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0 -2.8 0M7.6 12a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0 -2.8 0M13.6 12a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0 -2.8 0M10.6 17a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0 -2.8 0M16.6 17a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0 -2.8 0',
  interval:
    'M3.8 17a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M15.8 7a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M8 15l8 -6',
  chord:
    'M5 4v16M10 4v16M15 4v16M20 4v16M3 4h18M9 9a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M14 13a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M4 13a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
  swap: 'M4 8h14l-3 -3M20 16h-14l3 3',
  progression: 'M3 19h18M5 19v-6M10 19v-10M15 19v-8M20 19v-12',
  metronome: 'M8 20l3 -16h2l3 16zM12 14l5 -7',
  ear: 'M7 9a5 5 0 0 1 10 0c0 3 -3 4 -3 7a3 3 0 0 1 -5 2M10 9a2 2 0 0 1 4 0',
  bend: 'M4 18c6 0 8 -2 9 -6s2 -6 7 -6M17 3l3 3l-3 3',
} as const;

export type IconName = keyof typeof ICON_PATHS;

@Component({
  selector: 'app-icon',
  template: `
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path [attr.d]="path()" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      font-size: 1.15em;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  protected readonly path = computed(() => ICON_PATHS[this.name()]);
}
