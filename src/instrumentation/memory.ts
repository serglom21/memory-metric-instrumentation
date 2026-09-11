/**
 * Copyable client-side memory instrumentation for Sentry Application Metrics.
 *
 * Requires @sentry/react (or @sentry/browser) >= 10.25.0.
 *
 * This file is the artifact to copy into another app. It has no app-specific
 * imports. Wire it after Sentry.init():
 *
 *   startMemory() once at boot
 *   onScreenChange(screen) on every route change
 *   instrumentedPhase(name, fn) around significant work
 *   trackScreenRetention(screen) on mount; call the returned function on unmount
 *   setHeapLimitCap(bytes) only for tests / constrained-device simulation
 *
 * Do not put the measured heap value into a metric attribute — that turns a
 * high-volume gauge into an unbounded tag set. Do not sample from a bare
 * setInterval that does not attach the current screen.
 */
import * as Sentry from "@sentry/react";

// Capture the ramp toward an OOM kill without paying for 5s sampling all
// session. Rest is cheap; pressure is dense enough to see the climb.
export const SAMPLE_INTERVAL_REST_MS = 60_000;
export const SAMPLE_INTERVAL_PRESSURE_MS = 5_000;
export const UTILIZATION_HIGH = 0.7;
export const UTILIZATION_LOW = 0.6;

let heapLimitCapBytes: number | undefined;

/**
 * Cap the utilization denominator. Production callers omit this and use
 * `jsHeapSizeLimit`. Tests and constrained-device demos pass a smaller
 * budget so a desktop tab can still cross 0.70 without allocating gigabytes.
 */
export function setHeapLimitCap(bytes: number | undefined): void {
  heapLimitCapBytes =
    typeof bytes === "number" && bytes > 0 ? bytes : undefined;
}

const RETENTION_DELAY_MS = 2_000;

type HeapSnapshot = {
  used: number;
  limit: number;
  ratio: number;
};

type ExtraAttributes = Record<string, string | number | boolean>;

const sessionStartedAt = Date.now();
const sessionId = createSessionId();

let currentScreen = "unknown";
let navigationCount = 0;
let extraAttributes: ExtraAttributes = {};
let lastUasRoute: string | null = null;
let sampleTimer: number | undefined;
let currentInterval = SAMPLE_INTERVAL_REST_MS;
let dangerZoneLatched = false;
let pagehideBound = false;
let started = false;

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sess-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

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

function bucketSessionElapsed(minutes: number): string {
  if (minutes < 5) return "0-5";
  if (minutes < 15) return "5-15";
  if (minutes < 30) return "15-30";
  if (minutes < 60) return "30-60";
  return "60+";
}

function bucketNavigationCount(count: number): string {
  if (count <= 3) return "1-3";
  if (count <= 10) return "4-10";
  if (count <= 25) return "11-25";
  return "26+";
}

function deviceModel(): string {
  const uaData = (
    navigator as Navigator & { userAgentData?: { model?: string; platform?: string } }
  ).userAgentData;
  if (uaData?.model) {
    return uaData.model;
  }
  if (uaData?.platform) {
    return uaData.platform;
  }
  return navigator.platform || "unknown";
}

function sessionConstantAttributes(heap: HeapSnapshot | null): ExtraAttributes {
  return {
    platform: "web",
    device_model: deviceModel(),
    heap_limit_mb: heap ? Math.round(heap.limit / (1024 * 1024)) : 0,
    session_id: sessionId,
  };
}

function changingAttributes(): ExtraAttributes {
  const elapsedMin = (Date.now() - sessionStartedAt) / 60_000;
  return {
    screen: currentScreen,
    session_elapsed_min: bucketSessionElapsed(elapsedMin),
    navigation_count: bucketNavigationCount(Math.max(1, navigationCount)),
  };
}

function metricAttributes(extra?: ExtraAttributes): ExtraAttributes {
  const heap = readHeap();
  return {
    ...sessionConstantAttributes(heap),
    ...changingAttributes(),
    ...extraAttributes,
    ...extra,
  };
}

function applyScopeAttributes(heap: HeapSnapshot | null): void {
  Sentry.setAttributes({
    ...sessionConstantAttributes(heap),
    ...changingAttributes(),
  });
}

function emitHeapSample(options?: {
  final?: boolean;
  extra?: ExtraAttributes;
}): HeapSnapshot | null {
  const heap = readHeap();
  if (!heap) {
    return null;
  }

  applyScopeAttributes(heap);

  const attributes = metricAttributes({
    ...(options?.final ? { final: true } : {}),
    ...options?.extra,
  });

  Sentry.metrics.gauge("app.memory.utilization", heap.ratio, {
    unit: "none",
    attributes,
  });
  Sentry.metrics.gauge("app.memory.heap_used", heap.used, {
    unit: "byte",
    attributes,
  });

  if (heap.ratio >= UTILIZATION_HIGH && !dangerZoneLatched) {
    dangerZoneLatched = true;
    Sentry.metrics.count("app.memory.danger_zone", 1, { attributes });
  } else if (heap.ratio < UTILIZATION_LOW) {
    dangerZoneLatched = false;
  }

  if (heap.ratio >= UTILIZATION_HIGH) {
    currentInterval = SAMPLE_INTERVAL_PRESSURE_MS;
  } else if (heap.ratio < UTILIZATION_LOW) {
    currentInterval = SAMPLE_INTERVAL_REST_MS;
  }

  return heap;
}

async function measureUserAgentSpecificMemory(): Promise<void> {
  const perf = performance as Performance & {
    measureUserAgentSpecificMemory?: () => Promise<{ bytes: number }>;
  };
  if (typeof perf.measureUserAgentSpecificMemory !== "function") {
    return;
  }
  if (typeof crossOriginIsolated !== "undefined" && !crossOriginIsolated) {
    return;
  }
  try {
    const result = await perf.measureUserAgentSpecificMemory();
    if (typeof result?.bytes !== "number") {
      return;
    }
    Sentry.metrics.gauge("app.memory.total_uas", result.bytes, {
      unit: "byte",
      attributes: metricAttributes(),
    });
  } catch {
    // Permission, isolation, or browser policy — degrade silently.
  }
}

function scheduleNextSample(): void {
  sampleTimer = window.setTimeout(() => {
    emitHeapSample();
    scheduleNextSample();
  }, currentInterval);
}

function onPageHide(): void {
  emitHeapSample({ final: true });
  void Sentry.flush(2000);
}

export function sampleCurrentMemory(extra?: ExtraAttributes): void {
  emitHeapSample({ extra });
}

export function startMemory(): void {
  if (started) {
    return;
  }
  started = true;
  applyScopeAttributes(readHeap());
  emitHeapSample();
  scheduleNextSample();
  if (!pagehideBound) {
    pagehideBound = true;
    window.addEventListener("pagehide", onPageHide);
  }
}

export function stopMemory(): void {
  started = false;
  if (sampleTimer !== undefined) {
    window.clearTimeout(sampleTimer);
    sampleTimer = undefined;
  }
}

export function onScreenChange(
  screen: string,
  extra?: ExtraAttributes,
): void {
  currentScreen = screen;
  navigationCount += 1;
  extraAttributes = extra ?? {};
  applyScopeAttributes(readHeap());

  if (lastUasRoute !== screen) {
    lastUasRoute = screen;
    void measureUserAgentSpecificMemory();
  }
}

export async function instrumentedPhase<T>(
  name: string,
  fn: () => Promise<T> | T,
): Promise<T> {
  return Sentry.startSpan(
    { name, op: "app.phase", attributes: { phase: name } },
    async () => {
      const before = readHeap();
      const result = await fn();
      const after = readHeap();
      if (before && after) {
        Sentry.metrics.distribution("app.memory.delta", after.used - before.used, {
          unit: "byte",
          attributes: metricAttributes({ phase: name }),
        });
      }
      return result;
    },
  );
}

export function trackScreenRetention(screen: string): () => void {
  const baseline = readHeap();
  return () => {
    window.setTimeout(() => {
      const now = readHeap();
      if (!baseline || !now) {
        return;
      }
      Sentry.metrics.distribution(
        "app.memory.retained_delta",
        now.used - baseline.used,
        {
          unit: "byte",
          attributes: metricAttributes({ screen }),
        },
      );
    }, RETENTION_DELAY_MS);
  };
}
