// Exponential backoff for failed syncs (§6.1). Full-jitter on 2G/3G so a whole
// choir coming back online at once doesn't stampede the edge function.

export interface BackoffOptions {
  baseMs?: number;
  maxMs?: number;
  /** Multiply the deterministic delay by 0.5..1.0 to spread retries. */
  jitter?: boolean;
  /** Injectable RNG for deterministic tests. */
  random?: () => number;
}

const DEFAULTS = { baseMs: 1_000, maxMs: 5 * 60_000 };

export class Backoff {
  private attempt = 0;
  private readonly baseMs: number;
  private readonly maxMs: number;
  private readonly jitter: boolean;
  private readonly random: () => number;

  constructor(opts: BackoffOptions = {}) {
    this.baseMs = opts.baseMs ?? DEFAULTS.baseMs;
    this.maxMs = opts.maxMs ?? DEFAULTS.maxMs;
    this.jitter = opts.jitter ?? true;
    this.random = opts.random ?? Math.random;
  }

  /** Delay for the *next* retry, growing 1×,2×,4×… capped at maxMs. */
  next(): number {
    const capped = Math.min(this.maxMs, this.baseMs * 2 ** this.attempt);
    this.attempt += 1;
    if (!this.jitter) return capped;
    // Full jitter: random point in [capped/2, capped].
    return Math.round(capped * (0.5 + 0.5 * this.random()));
  }

  /** Call after a successful sync so the next failure starts fresh. */
  reset(): void {
    this.attempt = 0;
  }

  get attempts(): number {
    return this.attempt;
  }
}
