/**
 * Pattern 6 — Session-static facts repeated per span (ANTIPATTERN)
 *
 * Symptom in Sentry: cpu_cores, ram_gb, gpu_tier attached to every
 * frequently-fired span (here: a ui.heartbeat on each memory tick).
 * The values never change during the session; repeating them inflates
 * payload size and looks like cardinality that isn't.
 */
import * as Sentry from "@sentry/react";
import { deviceFacts } from "../lib/device";

export function installSessionFacts(): void {
  // Facts are re-attached on every heartbeat instead of once at init.
}

export function emitDeviceHeartbeat(): void {
  const facts = deviceFacts();
  Sentry.startSpan(
    {
      name: "ui.heartbeat",
      op: "ui.heartbeat",
      attributes: {
        cpu_cores: facts.cpu_cores,
        ram_gb: facts.ram_gb,
        gpu_tier: facts.gpu_tier,
      },
    },
    () => undefined,
  );
}
