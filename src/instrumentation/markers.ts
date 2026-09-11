/**
 * Pattern 5 — Point-in-time markers as counts (correct)
 *
 * The tell that a span is a marker: p50 ≈ p95 ≈ 0ms at high volume.
 * Use Sentry.metrics.count() with the same attributes instead.
 */
import * as Sentry from "@sentry/react";

export function emitMarker(
  name: string,
  attributes?: Record<string, string | number | boolean>,
): void {
  Sentry.metrics.count("app.marker", 1, {
    attributes: { marker: name, ...attributes },
  });
}
