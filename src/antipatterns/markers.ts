/**
 * Pattern 5 — Point-in-time markers emitted as spans (ANTIPATTERN)
 *
 * Symptom in Sentry: near-zero-duration spans named like Redux actions
 * (`catalog/FETCH_COMPLETE`), lifecycle hooks (`viewWillAppear`), or
 * readiness checks. p50 equals p95 equals ~0ms at high volume.
 */
import * as Sentry from "@sentry/react";

export function emitMarker(name: string): void {
  Sentry.startSpan({ name, op: "marker" }, () => undefined);
}
