/**
 * Pattern 1 — Spans bounded by app lifecycle (correct)
 *
 * Same BootstrapToFirstScreen span as the antipattern, but closed on
 * visibilitychange and force-ended past a sane ceiling. The close call on
 * first-screen mount is usually already there; the guard is what stops a
 * backgrounded tab from poisoning p95 with a multi-hour cancelled transaction.
 */
import * as Sentry from "@sentry/react";
import { delay } from "../lib/delay";

export const BOOTSTRAP_SPAN_MAX_MS = 8_000;
export const BACKGROUND_BOOT_DEMO_MS = 30_000;

let span: Sentry.Span | undefined;
let timeoutId: number | undefined;
let ended = false;

function clearTimeoutGuard(): void {
  if (timeoutId !== undefined) {
    window.clearTimeout(timeoutId);
    timeoutId = undefined;
  }
}

function endBootstrap(
  reason: "first-screen" | "cancelled" | "timeout",
): void {
  if (!span || ended) {
    return;
  }
  ended = true;
  clearTimeoutGuard();
  document.removeEventListener("visibilitychange", onVisibilityChange);
  if (reason === "cancelled" || reason === "timeout") {
    span.setStatus({ code: 2, message: "cancelled" });
  } else {
    span.setStatus({ code: 1 });
  }
  span.setAttribute("end_reason", reason);
  span.end();
  span = undefined;
}

function onVisibilityChange(): void {
  if (document.hidden) {
    endBootstrap("cancelled");
  }
}

export function startBootstrap(): void {
  endBootstrap("cancelled");
  ended = false;
  span = Sentry.startInactiveSpan({
    name: "BootstrapToFirstScreen",
    op: "app.bootstrap",
    forceTransaction: true,
  });
  document.addEventListener("visibilitychange", onVisibilityChange);
  timeoutId = window.setTimeout(() => {
    endBootstrap("timeout");
  }, BOOTSTRAP_SPAN_MAX_MS);
}

export function onFirstScreen(): void {
  endBootstrap("first-screen");
}

export async function simulateBackgroundBoot(
  ms: number = BACKGROUND_BOOT_DEMO_MS,
): Promise<void> {
  startBootstrap();
  await delay(ms);
  onFirstScreen();
}
