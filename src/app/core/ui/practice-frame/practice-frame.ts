import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  TemplateRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Drill } from '../../practice/drill';
import { PracticeLog } from '../../practice/practice-log';
import { IDLE_LIMIT_MS, formatClock, formatDuration } from '../../practice/session-log';
import { accuracyBand } from '../../practice/stats';
import { Icon } from '../icon';
import { keepScreenAwake } from '../keep-awake';
import { capitalize, formatSeconds, percentCorrect, plural } from '../text';

/**
 * Everything around a practice prompt: the session bar, the start, pause and summary screens,
 * and the reveal, verdict and next buttons with their keyboard shortcuts. A module supplies
 * what to ask (`prompt`) and, for self-checked answers, what to show on reveal (`answer`).
 * Leaving the page ends the session, which saves it.
 */
@Component({
  selector: 'app-practice-frame',
  imports: [NgTemplateOutlet, RouterLink, Icon],
  templateUrl: './practice-frame.html',
  styleUrl: './practice-frame.css',
  host: {
    '(document:keydown)': 'onKeydown($event)',
    '(document:pointerdown)': 'usingKeyboard = false',
  },
})
export class PracticeFrame implements OnDestroy {
  protected readonly drill = inject(Drill);
  protected readonly log = inject(PracticeLog);
  protected readonly run = this.drill.run;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The question: shown while a session runs. */
  readonly prompt = input.required<TemplateRef<unknown>>();
  /**
   * Shown in its own panel once the answer is revealed or checked. Without it, the result and
   * the Next button go at the bottom of the prompt panel.
   */
  readonly answer = input<TemplateRef<unknown>>();

  protected readonly view = this.run.view;
  protected readonly phase = this.run.phase;
  protected readonly idleMinutes = IDLE_LIMIT_MS / 60_000;
  protected readonly unitLabel = capitalize(this.drill.unit + 's');

  /** Live figures for the session bar. */
  protected readonly progress = computed(() => {
    const open = this.log.current();
    const answered = open?.answered ?? 0;
    return {
      clock: formatClock(this.log.activeMs()),
      answered: plural(answered, this.drill.unit),
      accuracy: percentCorrect(open?.correct ?? 0, answered),
      band: accuracyBand({ attempts: answered, correct: open?.correct ?? 0 }),
    };
  });

  protected readonly summary = computed(() => {
    const record = this.run.lastSession();
    return record
      ? {
          logged: record.answered > 0,
          time: formatDuration(record.activeMs),
          answered: String(record.answered),
          accuracy: percentCorrect(record.correct, record.answered),
        }
      : null;
  });

  /** The countdown as a list of zero or one, so the template can restart its bar for each one. */
  protected readonly countdowns = computed(() => {
    const countdown = this.run.countdown();
    return countdown ? [countdown] : [];
  });

  /** "Correct, 2.1 s", or just "Correct" when the module doesn't time answers. */
  protected readonly correctText = computed(() => {
    const ms = this.run.responseMs();
    return ms === null ? 'Correct' : `Correct, ${formatSeconds(ms)}`;
  });

  private readonly primaryAction = viewChild<ElementRef<HTMLElement>>('primaryAction');

  /**
   * Whether you last used the keyboard rather than a mouse or finger. Answer controls only take
   * focus for keyboard users: a focus ring on an answer button would look like a preselected answer.
   */
  protected usingKeyboard = false;

  constructor() {
    // Until the session goes idle: then the phone may lock as usual.
    keepScreenAwake(computed(() => this.view() === 'running' && !this.log.idle()));

    // The button you used disappears when the step changes: move focus to the next one, or, for
    // keyboard users, to whatever the module marked with data-autofocus (such as answer buttons).
    afterRenderEffect(() => {
      this.view();
      this.phase();
      this.run.current();
      const answerControl = this.usingKeyboard
        ? this.host.nativeElement.querySelector<HTMLElement>('[data-autofocus]')
        : null;
      (this.primaryAction()?.nativeElement ?? answerControl)?.focus();
    });
  }

  ngOnDestroy(): void {
    this.run.end();
  }

  protected onKeydown(event: KeyboardEvent): void {
    this.usingKeyboard = true;
    // Leave keys alone while a form control has focus (arrows move between radio options there)
    // and when a module's own control already handled them.
    const inControl =
      event.target instanceof HTMLElement &&
      event.target.closest('input, select, textarea') !== null;
    if (
      this.view() !== 'running' ||
      event.defaultPrevented ||
      inControl ||
      event.repeat ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }
    const phase = this.phase();
    let handled = true;
    if (event.key === ' ' && phase === 'prompt' && this.drill.selfCheck) {
      this.run.reveal();
    } else if ((event.key === ' ' || event.key === 'ArrowRight') && phase === 'answered') {
      this.run.next();
    } else if (event.key === 'ArrowRight' && phase === 'revealed') {
      this.run.selfCheck(true);
    } else if (event.key === 'ArrowLeft' && phase === 'revealed') {
      this.run.selfCheck(false);
    } else {
      handled = false;
    }
    if (handled) {
      // Stops Space from also clicking the focused button or scrolling the page.
      event.preventDefault();
    }
  }
}
