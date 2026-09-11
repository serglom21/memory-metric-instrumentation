/**
 * Pattern 7 — Memory instrumentation (ANTIPATTERN)
 *
 * Symptom in Sentry: utilization samples with no `screen` context, danger_zone
 * firing on every tick above 0.70 (not an edge), heap values stuffed into
 * attributes, and retained_delta emitted on unmount instead of 2s later so it
 * includes the next screen's allocations. Sampling is a bare 5s setInterval.
 */
import * as Sentry from "@sentry/react";
import { emitDeviceHeartbeat } from "./sessionFacts";

let heapLimitCapBytes: number | undefined;

export function setHeapLimitCap(bytes: number | undefined): void {
  heapLimitCapBytes =
    typeof bytes === "number" && bytes > 0 ? bytes : undefined;
}

type HeapSnapshot = {
  used: number;
  limit: number;
  ratio: number;
};

function readHeap(): HeapSnapshot | null {
  const memory = (
    performance as Performance & {
      memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
    }
  ).memory;
  if (
    !memory ||
    typeof memory.usedJSHeapSize !== "number" ||
    typeof memory.jsHeapSizeLimit !== "number" ||
    memory.jsHeapSizeLimit <= 0
  ) {
    return null;
  }
  const nativeLimit = memory.jsHeapSizeLimit;
  const limit =
    heapLimitCapBytes && heapLimitCapBytes > 0
      ? Math.min(nativeLimit, heapLimitCapBytes)
      : nativeLimit;
  return {
    used: memory.usedJSHeapSize,
    limit,
    ratio: memory.usedJSHeapSize / limit,
  };
}

let intervalId: number | undefined;
let started = false;

function sample(): void {
  const heap = readHeap();
  if (!heap) {
    return;
  }

  const attributes = {
    heap_used_bytes: heap.used,
    utilization: heap.ratio,
  };

  Sentry.metrics.gauge("app.memory.utilization", heap.ratio, {
    unit: "none",
    attributes,
  });
  Sentry.metrics.gauge("app.memory.heap_used", heap.used, {
    unit: "byte",
    attributes,
  });

  if (heap.ratio >= 0.7) {
    Sentry.metrics.count("app.memory.danger_zone", 1, { attributes });
  }

  emitDeviceHeartbeat();
}

export function sampleCurrentMemory(): void {
  sample();
}

export function startMemory(): void {
  if (started) {
    return;
  }
  started = true;
  sample();
  intervalId = window.setInterval(sample, 5_000);
}

export function stopMemory(): void {
  started = false;
  if (intervalId !== undefined) {
    window.clearInterval(intervalId);
    intervalId = undefined;
  }
}

export function onScreenChange(_screen: string): void {
  // Intentionally ignored — samples have no screen context.
}

export async function instrumentedPhase<T>(
  name: string,
  fn: () => Promise<T> | T,
): Promise<T> {
  const before = readHeap();
  const result = await fn();
  const after = readHeap();
  if (before && after) {
    Sentry.metrics.distribution("app.memory.delta", after.used - before.used, {
      unit: "byte",
      attributes: {
        phase: name,
        heap_used_bytes: after.used,
      },
    });
  }
  return result;
}

export function trackScreenRetention(screen: string): () => void {
  const baseline = readHeap();
  return () => {
    const now = readHeap();
    if (!baseline || !now) {
      return;
    }
    Sentry.metrics.distribution(
      "app.memory.retained_delta",
      now.used - baseline.used,
      {
        unit: "byte",
        attributes: { screen: `${screen}:${location.pathname}` },
      },
    );
  };
}
