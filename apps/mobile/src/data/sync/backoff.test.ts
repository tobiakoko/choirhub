import { Backoff } from './backoff';

describe('Backoff', () => {
  it('grows the delay exponentially and caps it', () => {
    const backoff = new Backoff({ baseMs: 100, maxMs: 800, jitter: false });
    expect(backoff.next()).toBe(100); // 100 * 2^0
    expect(backoff.next()).toBe(200); // 100 * 2^1
    expect(backoff.next()).toBe(400); // 100 * 2^2
    expect(backoff.next()).toBe(800); // 100 * 2^3
    expect(backoff.next()).toBe(800); // capped
  });

  it('resets to the base delay after a success', () => {
    const backoff = new Backoff({ baseMs: 100, maxMs: 800, jitter: false });
    backoff.next();
    backoff.next();
    backoff.reset();
    expect(backoff.next()).toBe(100);
  });

  it('applies full jitter within [delay/2, delay]', () => {
    // random() = 0 → lower bound, random() = 1 → upper bound.
    const low = new Backoff({ baseMs: 1000, jitter: true, random: () => 0 });
    expect(low.next()).toBe(500);
    const high = new Backoff({ baseMs: 1000, jitter: true, random: () => 1 });
    expect(high.next()).toBe(1000);
  });
});
