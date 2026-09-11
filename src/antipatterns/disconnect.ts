/**
 * Pattern 2 — Outer span not awaiting inner work (ANTIPATTERN)
 *
 * Symptom in Sentry: `provider.disconnect` is ~0ms, nested
 * `provider.disconnect.inner` is ~226ms. The trace claims teardown is
 * instant because disconnect() is fired without await and the outer span
 * ends immediately.
 */
import * as Sentry from "@sentry/react";
import { provider } from "../lib/provider";

export async function disconnectProvider(): Promise<void> {
  await Sentry.startSpan(
    { name: "provider.disconnect", op: "stream.disconnect" },
    () => {
      void provider.disconnect();
    },
  );
}
