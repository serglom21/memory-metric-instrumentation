/**
 * Pattern 8 — Streaming session lifecycle (correct)
 *
 * Parent `streaming.session` span owns connect / quality_change / teardown
 * children. `streaming.session.duration` is a distribution emitted *inside*
 * teardown, and memory utilization is sampled with that session span active
 * so a heap spike during playback joins to the session that caused it.
 */
import * as Sentry from "@sentry/react";
import { provider } from "../lib/provider";
import { sampleCurrentMemory } from "./memory";

type Session = {
  span: Sentry.Span;
  sessionId: string;
  titleId: string;
  quality: string;
  startedAt: number;
  sampleTimer: number;
};

let current: Session | undefined;

function sessionAttributes(session: Session) {
  return {
    session_id: session.sessionId,
    title_id: session.titleId,
    stream_quality: session.quality,
    platform: "web",
  };
}

export function startStreamingSession(
  titleId: string,
  quality: string,
): void {
  void teardownStreamingSession();

  const sessionId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `stream-${Date.now()}`;

  const span = Sentry.startInactiveSpan({
    name: "streaming.session",
    op: "stream.session",
    attributes: {
      session_id: sessionId,
      title_id: titleId,
      stream_quality: quality,
      platform: "web",
    },
  });

  const session: Session = {
    span,
    sessionId,
    titleId,
    quality,
    startedAt: performance.now(),
    sampleTimer: window.setInterval(() => {
      Sentry.withActiveSpan(span, () => {
        sampleCurrentMemory({ session_id: sessionId, title_id: titleId });
      });
    }, 5_000),
  };
  current = session;

  Sentry.startSpan(
    {
      name: "streaming.session/start",
      op: "stream.start",
      attributes: sessionAttributes(session),
      parentSpan: span,
    },
    () => undefined,
  );

  void Sentry.startSpan(
    {
      name: "streaming.session/connect",
      op: "stream.connect",
      attributes: sessionAttributes(session),
      parentSpan: span,
    },
    async () => {
      await provider.switchQuality(quality);
    },
  );
}

export async function changeStreamQuality(quality: string): Promise<void> {
  if (!current) {
    return;
  }
  current.quality = quality;
  current.span.setAttribute("stream_quality", quality);
  await Sentry.startSpan(
    {
      name: "streaming.session/quality_change",
      op: "stream.quality_change",
      attributes: sessionAttributes(current),
      parentSpan: current.span,
    },
    async () => {
      await provider.switchQuality(quality);
    },
  );
}

export async function teardownStreamingSession(): Promise<void> {
  const session = current;
  current = undefined;
  if (!session) {
    return;
  }
  window.clearInterval(session.sampleTimer);
  const durationMs = performance.now() - session.startedAt;
  await Sentry.startSpan(
    {
      name: "streaming.session/teardown",
      op: "stream.teardown",
      attributes: sessionAttributes(session),
      parentSpan: session.span,
    },
    () => {
      Sentry.metrics.distribution("streaming.session.duration", durationMs, {
        unit: "millisecond",
        attributes: sessionAttributes(session),
      });
    },
  );
  session.span.end();
}
