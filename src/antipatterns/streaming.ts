/**
 * Pattern 8 — Streaming session lifecycle (ANTIPATTERN)
 *
 * Symptom in Sentry: streaming spans with title ids interpolated into the
 * description, no parent session, duration recorded as a span instead of a
 * distribution, and no memory samples during playback — so a heap spike
 * cannot be joined to the stream that caused it.
 */
import * as Sentry from "@sentry/react";
import { provider } from "../lib/provider";

let startedAt = 0;
let titleId = "";

export function startStreamingSession(nextTitleId: string, nextQuality: string): void {
  titleId = nextTitleId;
  startedAt = performance.now();
  Sentry.startSpan(
    { name: `streaming.session/start - ${nextTitleId}`, op: "stream.start" },
    () => undefined,
  );
  void Sentry.startSpan(
    { name: `streaming.session/connect - ${nextTitleId}`, op: "stream.connect" },
    async () => {
      await provider.switchQuality(nextQuality);
    },
  );
}

export async function changeStreamQuality(nextQuality: string): Promise<void> {
  await Sentry.startSpan(
    {
      name: `streaming.session/quality_change - ${titleId} - ${nextQuality}`,
      op: "stream.quality_change",
    },
    async () => {
      await provider.switchQuality(nextQuality);
    },
  );
}

export async function teardownStreamingSession(): Promise<void> {
  const durationMs = startedAt ? performance.now() - startedAt : 0;
  Sentry.startSpan(
    {
      name: `streaming.session/teardown - ${titleId}`,
      op: "stream.teardown",
    },
    () => {
      Sentry.startSpan(
        {
          name: `streaming.session.duration - ${Math.round(durationMs)}ms`,
          op: "stream.duration",
        },
        () => undefined,
      );
    },
  );
  startedAt = 0;
}
