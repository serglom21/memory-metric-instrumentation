/**
 * Pattern 4 — Double emission (ANTIPATTERN)
 *
 * Symptom in Sentry: two spans covering the same interval — the browser's
 * auto-instrumented `measure` span from performance.measure() plus a manual
 * `performance.metrics` span. Double ingestion, zero additional signal.
 */
import * as Sentry from "@sentry/react";

export async function withUserTiming<T>(
  phase: string,
  fn: () => Promise<T> | T,
): Promise<T> {
  const markStart = `${phase}-start`;
  const markEnd = `${phase}-end`;
  performance.mark(markStart);
  const startedAt = performance.now();
  return Sentry.startSpan(
    { name: "performance.metrics", op: "measure", attributes: { phase } },
    async () => {
      try {
        return await fn();
      } finally {
        performance.mark(markEnd);
        performance.measure(phase, markStart, markEnd);
        void startedAt;
      }
    },
  );
}
