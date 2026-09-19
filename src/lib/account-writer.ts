// Keep serialization off the tap handler, coalesce bursts, and preserve write
// order independently for each account. Every caller receives its save result.
export function createAccountWriter<T>(write: (key: string, value: T) => Promise<boolean>) {
  const queues = new Map<string, { latest: T; waiters: ((ok: boolean) => void)[]; running: boolean }>();
  async function drain(key: string) {
    const queue = queues.get(key)!;
    while (queue.waiters.length) {
      const value = queue.latest;
      const waiters = queue.waiters.splice(0);
      let ok = false;
      try { ok = await write(key, value); } catch { /* resolved false for all callers */ }
      waiters.forEach(resolve => resolve(ok));
    }
    queues.delete(key);
  }
  return (key: string, value: T): Promise<boolean> => new Promise(resolve => {
    let queue = queues.get(key);
    if (!queue) { queue = { latest: value, waiters: [], running: false }; queues.set(key, queue); }
    queue.latest = value;
    queue.waiters.push(resolve);
    if (!queue.running) { queue.running = true; setTimeout(() => { void drain(key); }, 0); }
  });
}
