import { useEffect, useState } from "react";
import { getMode, setMode, subscribeMode, type InstrumentationMode } from "../mode";
import {
  isLeakEnabled,
  leakedBytes,
  leakedSessionCount,
  setLeakEnabled,
  subscribeLeak,
} from "./leak";
import {
  getPressureMb,
  setPressureMb,
  subscribePressure,
} from "./pressure";
import { DEMO_DEVICE_HEAP_BYTES } from "./constrainedHeap";
import { patterns } from "../active";
import { formatBytes, readPerformanceMemory } from "../lib/heap";
import {
  getTrafficLoops,
  isTrafficEnabled,
  setTrafficEnabled,
  subscribeTraffic,
  subscribeTrafficLoops,
} from "./traffic";

export function DevPanel() {
  const [mode, setModeState] = useState<InstrumentationMode>(getMode);
  const [leak, setLeakState] = useState(isLeakEnabled);
  const [pressure, setPressureState] = useState(getPressureMb);
  const [leaked, setLeaked] = useState(() => ({
    count: leakedSessionCount(),
    bytes: leakedBytes(),
  }));
  const [heap, setHeap] = useState(readPerformanceMemory);
  const [bootRemaining, setBootRemaining] = useState<number | null>(null);
  const [traffic, setTrafficState] = useState(isTrafficEnabled);
  const [trafficLoops, setTrafficLoops] = useState(getTrafficLoops);
  const [crossing, setCrossing] = useState(false);
  const [isolated] = useState(
    () => typeof crossOriginIsolated !== "undefined" && crossOriginIsolated,
  );
  const hasDsn = Boolean(import.meta.env.VITE_SENTRY_DSN);

  useEffect(() => subscribeMode(() => setModeState(getMode())), []);
  useEffect(() => subscribeLeak(() => setLeakState(isLeakEnabled())), []);
  useEffect(() => subscribePressure(() => setPressureState(getPressureMb())), []);
  useEffect(() => subscribeTraffic(() => setTrafficState(isTrafficEnabled())), []);
  useEffect(() => subscribeTrafficLoops(() => setTrafficLoops(getTrafficLoops())), []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setHeap(readPerformanceMemory());
      setLeaked({ count: leakedSessionCount(), bytes: leakedBytes() });
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  async function onBackgroundBoot() {
    const started = Date.now();
    const duration = 30_000;
    setBootRemaining(30);
    const tick = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((duration - (Date.now() - started)) / 1000));
      setBootRemaining(left);
      if (left <= 0) {
        window.clearInterval(tick);
        setBootRemaining(null);
      }
    }, 250);
    await patterns().simulateBackgroundBoot(duration);
    window.clearInterval(tick);
    setBootRemaining(null);
  }

  async function onDangerZoneCrossing() {
    const previous = getPressureMb();
    setCrossing(true);
    const pause = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
    try {
      setPressureMb(210);
      await pause(80);
      patterns().sampleCurrentMemory();
      await pause(400);
      setPressureMb(20);
      await pause(80);
      patterns().sampleCurrentMemory();
      await pause(400);
      setPressureMb(210);
      await pause(80);
      patterns().sampleCurrentMemory();
      await pause(200);
      setPressureMb(previous);
      patterns().sampleCurrentMemory();
      window.dispatchEvent(new Event("pagehide"));
    } finally {
      setCrossing(false);
    }
  }

  return (
    <aside className="panel">
      <strong>Dev panel</strong>
      {!hasDsn ? (
        <p className="warn">No VITE_SENTRY_DSN — metrics will not leave this tab.</p>
      ) : null}

      <label className="row">
        Mode
        <select
          value={mode}
          onChange={(event) => {
            setMode(event.target.value as InstrumentationMode);
          }}
        >
          <option value="correct">Correct instrumentation</option>
          <option value="antipattern">Antipattern</option>
        </select>
      </label>

      <label className="row">
        <input
          type="checkbox"
          checked={leak}
          onChange={(event) => setLeakEnabled(event.target.checked)}
        />
        Leak toggle (Player retains ~8MB / visit)
      </label>
      <p className="meta">
        Leaked sessions: {leaked.count} ({formatBytes(leaked.bytes)})
      </p>

      <label className="row">
        Pressure {pressure} MB
        <input
          type="range"
          min={0}
          max={500}
          step={10}
          value={pressure}
          onChange={(event) => setPressureMb(Number(event.target.value))}
        />
      </label>
      <p className="meta">
        0.70 of the {Math.round(DEMO_DEVICE_HEAP_BYTES / (1024 * 1024))} MB demo
        ceiling is ~{Math.round((DEMO_DEVICE_HEAP_BYTES * 0.7) / (1024 * 1024))} MB.
        Native V8 limit is ~4 GB, so this slider cannot cross it unaided.
      </p>

      <button
        type="button"
        onClick={() => void onDangerZoneCrossing()}
        disabled={crossing}
      >
        {crossing ? "Crossing 0.70…" : "Emit a 0.70 danger_zone crossing"}
      </button>

      <label className="row">
        <input
          type="checkbox"
          checked={traffic}
          onChange={(event) => setTrafficEnabled(event.target.checked)}
        />
        Stream catalog→player traffic
      </label>
      <p className="meta">
        {traffic
          ? `Running — ${trafficLoops} loop${trafficLoops === 1 ? "" : "s"} sent this tab`
          : "Off. Turn on to generate traffic so dashboards have data."}
      </p>

      <button type="button" onClick={() => void onBackgroundBoot()} disabled={bootRemaining !== null}>
        {bootRemaining === null
          ? "Background the tab for 30s during boot"
          : `Boot span open — ${bootRemaining}s (hide the tab now)`}
      </button>

      <div className="heap">
        {heap ? (
          <>
            <div>
              usedJSHeapSize {formatBytes(heap.used)} / {formatBytes(heap.limit)}{" "}
              demo ceiling
            </div>
            <div>native jsHeapSizeLimit {formatBytes(heap.nativeLimit)}</div>
            <div>utilization {(heap.ratio * 100).toFixed(1)}%</div>
          </>
        ) : (
          <div>
            performance.memory unavailable (Chromium-only). Utilization will not
            emit.
          </div>
        )}
        <div>crossOriginIsolated: {isolated ? "true" : "false"}</div>
        <div>UAS API: {isolated ? "eligible" : "blocked — need COOP/COEP"}</div>
      </div>
    </aside>
  );
}
