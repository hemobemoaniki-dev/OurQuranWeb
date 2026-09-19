// Serialize this installation's cloud saves. Each task reads the latest local
// state only after the previous transaction settles; errors never jam the queue.
export function createSyncQueue() {
  let tail: Promise<unknown> = Promise.resolve();

  return function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const next = tail.then(task, task);
    // Only the sequencing tail discards the result. The caller still receives
    // the task's real result (for example, whether a Firebase push succeeded).
    tail = next.then(() => undefined, () => undefined);
    return next;
  };
}
