/**
 * Pattern 6 — Session-static facts once (correct)
 *
 * Device facts do not change during a session. Set them once via
 * Sentry.setAttributes so they ride along without being re-attached to
 * every heartbeat span, and emit them once as gauges for fleet segmentation.
 */
import * as Sentry from "@sentry/react";
import { deviceFacts } from "../lib/device";

let installed = false;

export function installSessionFacts(): void {
  const facts = deviceFacts();
  Sentry.setAttributes({
    cpu_cores: facts.cpu_cores,
    ram_gb: facts.ram_gb,
    gpu_tier: facts.gpu_tier,
  });

  if (installed) {
    return;
  }
  installed = true;
  Sentry.metrics.gauge("device.cpu_cores", facts.cpu_cores, {
    attributes: { gpu_tier: facts.gpu_tier },
  });
  Sentry.metrics.gauge("device.ram_gb", facts.ram_gb, {
    attributes: { gpu_tier: facts.gpu_tier },
  });
}
