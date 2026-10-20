import { isLevels, levelOf, nextLevel } from './tempo-ladder';

describe('tempo ladder', () => {
  it('goes up after a pass, and down after two fails in a row', () => {
    expect(nextLevel({ bpm: 96, failStreak: 1 }, true)).toEqual({ bpm: 100, failStreak: 0 });
    expect(nextLevel({ bpm: 96, failStreak: 0 }, false)).toEqual({ bpm: 96, failStreak: 1 });
    expect(nextLevel({ bpm: 96, failStreak: 1 }, false)).toEqual({ bpm: 92, failStreak: 0 });
  });

  it('stays within 40 and 240 bpm', () => {
    expect(nextLevel({ bpm: 240, failStreak: 0 }, true).bpm).toBe(240);
    expect(nextLevel({ bpm: 40, failStreak: 1 }, false).bpm).toBe(40);
  });

  it('starts a card at the start tempo', () => {
    const levels = { eighth: { bpm: 96, failStreak: 0 } };

    expect(levelOf(levels, 'eighth', 70).bpm).toBe(96);
    expect(levelOf(levels, 'quarter', 70)).toEqual({ bpm: 70, failStreak: 0 });
  });

  it('checks levels read back from storage', () => {
    expect(isLevels({ eighth: { bpm: 96, failStreak: 0 } })).toBe(true);
    expect(isLevels({ eighth: { bpm: '96' } })).toBe(false);
    expect(isLevels([])).toBe(false);
  });
});
