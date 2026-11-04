import { HEARD_HOLD_MS, HEARD_LEVEL, LevelMeter, meterPercent } from './level';

describe('meterPercent', () => {
  it('places levels on a decibel scale, from 60 dB below full scale to full scale', () => {
    expect(meterPercent(0)).toBe(0);
    expect(meterPercent(0.001)).toBeCloseTo(0);
    expect(meterPercent(0.1)).toBeCloseTo(66.7, 1);
    expect(meterPercent(1)).toBe(100);
  });

  it('keeps a boosted level past full scale at the end of the meter', () => {
    expect(meterPercent(4)).toBe(100);
  });

  it('puts the level the listeners hear about a quarter of the way along', () => {
    expect(meterPercent(HEARD_LEVEL)).toBeCloseTo(26, 0);
  });
});

describe('LevelMeter', () => {
  it('shows a pluck at once, then lets it fall back gradually', () => {
    const meter = new LevelMeter();

    expect(meter.push(0.1, 0).shown).toBe(0.1);
    const fading = meter.push(0, 50).shown;
    expect(fading).toBeLessThan(0.1);
    expect(fading).toBeGreaterThan(0.05);
    expect(meter.push(0.2, 100).shown).toBe(0.2);
  });

  it('says a note was heard for a while after it reached the line', () => {
    const meter = new LevelMeter();

    expect(meter.push(HEARD_LEVEL * 0.9, 0).heard).toBe(false);
    expect(meter.push(HEARD_LEVEL, 100).heard).toBe(true);
    expect(meter.push(0, 100 + HEARD_HOLD_MS).heard).toBe(true);
    expect(meter.push(0, 101 + HEARD_HOLD_MS).heard).toBe(false);
  });
});
