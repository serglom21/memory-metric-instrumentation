/**
 * Pattern 1 — Spans bounded by app lifecycle (ANTIPATTERN)
 *
 * Symptom in Sentry: BootstrapToFirstScreen transactions with multi-minute
 * or multi-hour durations and status `cancelled`. Started at init, ended
 * only when the first screen mounts, with no visibility or timeout guard.
 * Background the tab mid-boot and the span stays open until the tab returns.
 */
import * as Sentry from "@sentry/react";
import { delay } from "../lib/delay";

let span: Sentry.Span | undefined;

export function startBootstrap(): void {
  span?.end();
  span = Sentry.startInactiveSpan({
    name: "BootstrapToFirstScreen",
    op: "app.bootstrap",
    forceTransaction: true,
  });
}

export function onFirstScreen(): void {
  span?.setStatus({ code: 1 });
  span?.end();
  span = undefined;
}

export async function simulateBackgroundBoot(ms = 30_000): Promise<void> {
  startBootstrap();
  await delay(ms);
  onFirstScreen();
}
