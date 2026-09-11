/**
 * Pattern 2 — Outer span awaiting inner work (correct)
 *
 * await the async provider call so the outer span actually contains the
 * 226ms child. The 0ms-outer / 226ms-inner shape is an application bug
 * (fire-and-forget disconnect) that instrumentation made visible — the
 * fix is in the code, not in the span API.
 */
import * as Sentry from "@sentry/react";
import { PROVIDER_NAME, provider } from "../lib/provider";

export async function disconnectProvider(): Promise<void> {
  await Sentry.startSpan(
    {
      name: "provider.disconnect",
      op: "stream.disconnect",
      attributes: { "provider.name": PROVIDER_NAME },
    },
    async () => {
      await provider.disconnect();
    },
  );
}

