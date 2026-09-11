/**
 * Pattern 4 — Don't double-emit the same interval (correct)
 *
 * Keep the auto-instrumented User Timing span from performance.measure().
 * If you also want an aggregate trend (p95 of catalog load), emit a
 * distribution metric — not a second span covering the same range.
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
  try {
    return await fn();
  } finally {
    performance.mark(markEnd);
    performance.measure(phase, markStart, markEnd);
    Sentry.metrics.distribution(
      "app.phase.duration",
      performance.now() - startedAt,
      {
        unit: "millisecond",
        attributes: { phase },
      },
    );
  }
}
