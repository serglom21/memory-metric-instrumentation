let enabled = true;
const listeners = new Set<() => void>();

export function isLeakEnabled(): boolean {
  return enabled;
}

export function setLeakEnabled(next: boolean): void {
  enabled = next;
  listeners.forEach((listener) => listener());
}

export function subscribeLeak(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

type LeakedSession = {
  chunks: ArrayBuffer[];
  listeners: Array<{
    target: EventTarget;
    type: string;
    listener: EventListener;
  }>;
};

// Intentionally process-global. Each Player visit with the leak toggle on
// pushes ~8MB here and never removes it.
const leakedSessions: LeakedSession[] = [];

export function retainLeakedSession(session: LeakedSession): void {
  leakedSessions.push(session);
}

export function leakedSessionCount(): number {
  return leakedSessions.length;
}

export function leakedBytes(): number {
  return leakedSessions.reduce(
    (sum, session) =>
      sum + session.chunks.reduce((inner, chunk) => inner + chunk.byteLength, 0),
    0,
  );
}
