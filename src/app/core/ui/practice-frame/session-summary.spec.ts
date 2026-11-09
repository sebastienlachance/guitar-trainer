import { signal } from '@angular/core';
import { render, screen, within } from '@testing-library/angular';
import { Drill } from '../../practice/drill';
import { SessionAnswer, SessionGroups, SessionRecord } from '../../practice/session-log';
import { STORAGE_PREFIX } from '../../practice/storage';
import { SessionSummary } from './session-summary';

/** A session of 10 chords in 5 minutes, all right, 2 s each, unless told otherwise. */
function session(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: 'test-100000',
    module: 'test',
    startedAt: 100_000,
    endedAt: 400_000,
    activeMs: 300_000,
    answered: 10,
    correct: 10,
    totalResponseMs: 20_000,
    ...overrides,
  };
}

/** An earlier session, `eachMs` per answer. */
function earlier(startedAt: number, eachMs: number, groups?: SessionGroups): SessionRecord {
  return session({
    id: `test-${startedAt}`,
    startedAt,
    totalResponseMs: 10 * eachMs,
    ...(groups ? { groups } : {}),
  });
}

/** `answered` answers of `eachMs` each in one group. */
function on(key: string, eachMs: number, answered = 5): SessionGroups {
  return { [key]: { answered, totalResponseMs: answered * eachMs } };
}

/** Renders the summary for a stand-in module that groups chords by string set. */
async function renderSummary(
  record: SessionRecord,
  options: {
    history?: SessionRecord[];
    answers?: SessionAnswer[];
    waitsForRightAnswer?: boolean;
  } = {},
) {
  localStorage.setItem(STORAGE_PREFIX + 'sessions', JSON.stringify(options.history ?? []));
  const drill = {
    unit: 'chord',
    tags: signal(['sus4', 'Strings 2-3-4']),
    run: { answers: signal(options.answers ?? []) },
    answerGroups: { name: 'string set', heading: 'Strings', keys: ['1-2-3', '2-3-4', '3-4-5'] },
    describeCard: (key: string) => ({
      title: `${key}sus4`,
      detail: key === 'D' ? 'strings 3-4-5' : '',
    }),
    waitsForRightAnswer: signal(options.waitsForRightAnswer ?? false),
  };
  await render(SessionSummary, {
    inputs: { record },
    providers: [{ provide: Drill, useValue: drill }],
  });
}

describe('SessionSummary', () => {
  beforeEach(() => localStorage.clear());

  it('shows your time per chord against your last sessions, and the counts', async () => {
    await renderSummary(session({ correct: 9 }), {
      history: [earlier(90_000, 2500), earlier(80_000, 2500)],
    });

    expect(screen.getByText('Session saved')).toBeInTheDocument();
    expect(screen.getByText('Strings 2-3-4')).toBeInTheDocument();
    expect(screen.getByText('2.0 s')).toBeInTheDocument();
    expect(screen.getByText('per chord')).toBeInTheDocument();
    expect(screen.getByText('0.5 s faster than your last 2 sessions')).toHaveClass('faster');
    expect(screen.getByText('Time').nextElementSibling).toHaveTextContent('5 min');
    expect(screen.getByText('Chords').nextElementSibling).toHaveTextContent('10');
    expect(screen.getByText('Correct').nextElementSibling).toHaveTextContent('90%');
  });

  it.each([
    [1500, '0.5 s slower than your last session', 'slower'],
    [2040, 'The same as your last session', 'same'],
  ])('compares with a usual time of %i ms', async (usualMs, text, trend) => {
    await renderSummary(session(), { history: [earlier(90_000, usualMs)] });
    expect(screen.getByText(text)).toHaveClass(trend);
  });

  it('has nothing to compare with in a first session', async () => {
    await renderSummary(session());
    expect(screen.getByText('2.0 s')).toBeInTheDocument();
    expect(screen.queryByText(/than your last/)).not.toBeInTheDocument();
  });

  it.each([
    [10, false],
    [9, true],
  ])(
    'with the app waiting for the right answer, %i right out of 10 shows Correct: %s',
    async (correct, shown) => {
      await renderSummary(session({ correct }), { waitsForRightAnswer: true });
      expect(screen.queryByText('Correct') !== null).toBe(shown);
    },
  );

  it('times each string set of a session that spans several, against your usual there', async () => {
    const groups = { ...on('1-2-3', 1000), ...on('3-4-5', 5000) };
    await renderSummary(session({ totalResponseMs: 30_000, groups }), {
      history: [earlier(90_000, 2500, { ...on('1-2-3', 1000), ...on('3-4-5', 4000) })],
    });

    expect(screen.getByText('0.5 s slower than your last session')).toHaveTextContent(
      '0.5 s slower than your last session on these strings',
    );
    expect(screen.getByRole('heading', { name: 'By string set' })).toBeInTheDocument();
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(
      rows.map((row) =>
        within(row)
          .getAllByRole('cell')
          .map((cell) => cell.textContent?.trim()),
      ),
    ).toEqual([
      ['1-2-3', '5', '1.0 s', '1.0 s'],
      ['3-4-5', '5', '5.0 s', '4.0 s'],
    ]);
    expect(within(rows[1]).getAllByRole('cell')[2]).toHaveClass('slow');
  });

  it('leaves the table out for a session on one string set', async () => {
    await renderSummary(session({ groups: on('2-3-4', 2000, 10) }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('names your slowest chords, by their right answers', async () => {
    const answer = (key: string, responseMs: number, correct = true) => ({
      key,
      correct,
      responseMs,
    });
    await renderSummary(session(), {
      answers: [
        answer('C', 1000),
        answer('D', 4500),
        answer('E', 2000),
        answer('F', 3000),
        answer('C', 9000, false),
      ],
    });

    const slowest = screen.getByRole('heading', { name: 'Slowest this time' })
      .nextElementSibling as HTMLElement;
    const items = within(slowest).getAllByRole('listitem');
    expect(items.map((item) => item.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Dsus4 strings 3-4-5 4.5 s',
      'Fsus4 3.0 s',
      'Esus4 2.0 s',
    ]);
    expect(within(items[0]).getByText('4.5 s')).toHaveClass('slow');
  });

  it('says nothing was logged when no chord was answered', async () => {
    await renderSummary(session({ answered: 0, correct: 0, totalResponseMs: 0 }));
    expect(screen.getByRole('heading', { name: 'Session ended' })).toBeInTheDocument();
    expect(screen.getByText('No chords were answered, so nothing was logged.')).toBeInTheDocument();
  });
});
