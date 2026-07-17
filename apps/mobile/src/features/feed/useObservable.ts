// Bridges a WatermelonDB (RxJS) Observable into React state. Every feed read is a
// live query — when the sync engine writes a delta or an optimistic outbox row,
// the observable emits and the list re-renders with no manual refetch (the
// "observe → auto-update" contract, CLAUDE.md rule 3).

import { useEffect, useState } from 'react';

/** The minimal slice of an RxJS Observable we depend on. */
export interface Subscribable<T> {
  subscribe(observer: (value: T) => void): { unsubscribe: () => void };
}

/**
 * Subscribe to an observable built by `factory`, seeding with `initial` until the
 * first emission. `deps` re-subscribes when the query inputs change (e.g. the
 * signed-in profile id). The factory is intentionally not in the dep array — pass
 * a stable one or list its inputs in `deps`.
 */
export function useObservable<T>(
  factory: () => Subscribable<T>,
  initial: T,
  deps: readonly unknown[]
): T {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    const subscription = factory().subscribe(setValue);
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}
