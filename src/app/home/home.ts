import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BUILD, REPOSITORY_URL } from '../core/build-info';
import { PracticeLog } from '../core/practice/practice-log';
import { formatDuration } from '../core/practice/session-log';
import { Icon } from '../core/ui/icon';
import { plural } from '../core/ui/text';
import { MODULES, MODULE_GROUPS } from '../modules/registry';
import { recentModules, weekSummary, whenText } from './recent';

/** Modules in the "pick up where you left off" row. */
const RECENT_SHOWN = 3;

@Component({
  selector: 'app-home',
  imports: [RouterLink, Icon],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly log = inject(PracticeLog);

  protected readonly groups = MODULE_GROUPS.map((group) => ({
    ...group,
    modules: MODULES.filter((module) => module.group === group.id),
  }));

  /** The modules practised last: when, and for how long that day. */
  protected readonly recent = computed(() => {
    const now = Date.now();
    return recentModules(this.log.history(), RECENT_SHOWN).flatMap((recent) => {
      const module = MODULES.find((known) => known.path === recent.module);
      return module
        ? [
            {
              module,
              when: `${whenText(recent.lastAt, now)} · ${formatDuration(recent.activeMs)}`,
            },
          ]
        : [];
    });
  });

  /** "48 min · 4 days", or nothing yet this week. */
  protected readonly week = computed(() => {
    const { activeMs, days } = weekSummary(this.log.history(), Date.now());
    return days === 0 ? null : `${formatDuration(activeMs)} · ${plural(days, 'day')}`;
  });

  protected readonly build = BUILD;
  protected readonly commitUrl = BUILD ? `${REPOSITORY_URL}/commit/${BUILD.commit}` : '';
  protected readonly buildDate = BUILD
    ? new Date(BUILD.date).toLocaleDateString(undefined, { dateStyle: 'medium' })
    : '';
}
