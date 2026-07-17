// Client-generated UUIDs for the outbox (§6.1). These key the idempotent push and
// the optimistic local row; they are not security tokens, so a crypto RNG is a
// nicety, not a requirement — we use it when the runtime exposes one and fall back
// to an RFC-4122 v4 shape otherwise.

/** Generate a v4-shaped UUID. */
export function uuidv4(): string {
  const cryptoObj = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
