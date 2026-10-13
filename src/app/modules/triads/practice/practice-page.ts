import { Component, computed, inject } from '@angular/core';
import { targetPitchClasses } from '../../../core/audio/matchers';
import { MicStatus } from '../../../core/ui/mic-status';
import { PracticeFrame } from '../../../core/ui/practice-frame/practice-frame';
import { cardTitle, chordTarget, shapeLabel } from '../deck';
import { ChordReveal } from '../reveal/chord-reveal';
import { LabelMode } from '../settings';
import { TriadsSession } from '../triads-session';

/** Prompts a chord (and maybe a shape); you play it, then reveal the answer and judge yourself. */
@Component({
  selector: 'app-practice-page',
  imports: [PracticeFrame, MicStatus, ChordReveal],
  templateUrl: './practice-page.html',
  styleUrl: './practice-page.css',
})
export class PracticePage {
  protected readonly session = inject(TriadsSession);
  protected readonly card = this.session.run.current;
  protected readonly settings = this.session.settings;

  protected readonly title = computed(() => {
    const card = this.card();
    return card ? cardTitle(card) : '';
  });

  protected readonly subtitle = computed(() => {
    const shape = this.card()?.shape;
    return shape ? shapeLabel(shape) : '';
  });

  /** The chord's pitch classes, highlighted in the live spectrum while strumming. */
  protected readonly strumTarget = computed(() => {
    const card = this.card();
    return card && this.settings().micMode === 'strum'
      ? targetPitchClasses(chordTarget(card))
      : null;
  });

  protected setLabelMode(labelMode: LabelMode): void {
    this.session.updateSettings({ labelMode });
  }
}
