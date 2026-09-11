<img width="1630" height="989" alt="Screenshot 2026-09-11 at 1 41 25 PM" src="https://github.com/user-attachments/assets/ffac6170-de97-46ad-b047-a72c0a3c3d74" />

# Memory metric instrumentation

A small media-streaming SPA that demonstrates eight Sentry instrumentation
patterns. Each pattern has a **broken** version in `src/antipatterns/` and a
**corrected** version in `src/instrumentation/`. Toggle between them in the
corner panel and emit both into the same Sentry project.

The UI is not the point. Clone it, point it at a project, click around for two
minutes, and you should see memory metrics, trace-connected phase attribution,
and a leak signal.

## Setup

Requires Node 18.18+ (20+ recommended) and a Chromium browser for
`performance.memory`.

```bash
cp .env.example .env
# paste a browser DSN from Sentry → Settings → Client Keys
npm install
npm run dev
```

Do not commit `.env`. It is gitignored.

Open the printed localhost URL in Chrome. Firefox and Safari will run the app
but will not emit heap gauges — see [Heap caveats](#heap-caveats) below.

### Env vars

| Variable | Required | Purpose |
|---|---|---|
| `VITE_SENTRY_DSN` | yes | Browser DSN |
| `VITE_SENTRY_RELEASE` | no | Defaults to `memory-metric-instrumentation@0.1.0` |
| `VITE_SENTRY_ENVIRONMENT` | no | Defaults to Vite `mode` (`development` / `production`) |

Vite's dev and preview servers send `Cross-Origin-Opener-Policy: same-origin`
and `Cross-Origin-Embedder-Policy: require-corp` so
`performance.measureUserAgentSpecificMemory()` is actually available.

## Demo script

1. Set **Mode** to **Antipattern**. Click Catalog → a title → Play → back, a
   few times. In Sentry you should see:
   - `BootstrapToFirstScreen` (use the **Background the tab for 30s** button;
     hide the tab while the countdown runs) with a ~30s duration
   - `provider.disconnect` at ~0ms next to `provider.disconnect.inner` at ~226ms
   - Span names like `PageNavigation-/title/12` and `query.fetch.catalog - English (United States)`
   - A `performance.metrics` span sitting next to the auto `measure` span
   - Marker spans (`catalog/FETCH_COMPLETE`, `viewWillAppear`) with p50 ≈ p95 ≈ 0
   - `ui.heartbeat` spans carrying `cpu_cores` / `ram_gb` / `gpu_tier` every 5s
2. Set **Mode** to **Correct instrumentation**. Repeat the same click path.
   Those signatures flatten: one stable name per operation, markers become
   `app.marker` counts, device facts are set once, disconnect's outer span
   covers the inner work, and the boot span cancels on hide / times out at 8s.
3. **Leak ON** (default) → loop catalog → detail → player **five times**.
   `p95(app.memory.retained_delta)` grouped by `screen` climbs on `player`.
4. **Leak OFF** → repeat the loop. `retained_delta` on `player` goes flat.
5. Drag the **pressure** slider until on-screen utilization crosses 0.70
   (`danger_zone` fires once on the way up) and then 0.85 (the static monitor
   below). Sampling interval drops from 60s to 5s above 0.70. Utilization
   uses a **256 MB demo ceiling** so a desktop Chrome tab (~4 GB
   `jsHeapSizeLimit`) can actually reach those lines. Use **Emit a 0.70
   danger_zone crossing** if you want the counter without dragging.

Pattern 2 is an **application** bug that instrumentation made visible — the
outer span is 0ms because `disconnect()` was not awaited. The fix is in the
code, not in the span.

## Patterns

| # | Symptom in Sentry | Cause | Fix |
|---|---|---|---|
| 1 | `BootstrapToFirstScreen` with multi-hour duration and `cancelled` status, poisoning boot p95 | Span started at init, ended only when the first screen mounts; tab backgrounded mid-boot | Subscribe to `visibilitychange` and force-end past a ceiling. The guard matters more than the close call — the close call is usually already there. |
| 2 | Outer `provider.disconnect` ~0ms, inner span ~226ms | `provider.disconnect()` fired without `await` | Await the inner call so the outer span contains it. This is an app bug, not an instrumentation bug. |
| 3 | Unbounded unique span names (`query.fetch.catalog - <locale>`, `PageNavigation-/title/42`, `ConnectProvider-mock-cdn`) | Variable data interpolated into the description | One stable description per operation; put `locale`, `page.route`, `provider.name` on attributes |
| 4 | Two spans covering the same interval | Manual `performance.metrics` span plus the browser's auto-instrumented `performance.measure()` span | Keep the auto span. If you need an aggregate trend, emit `app.phase.duration` as a distribution instead of a second span. |
| 5 | Spans where p50 ≈ p95 ≈ 0ms (`catalog/FETCH_COMPLETE`, `viewWillAppear`) | Point-in-time markers modeled as spans | `Sentry.metrics.count("app.marker")` with the same attributes |
| 6 | `cpu_cores` / `ram_gb` / `gpu_tier` on every heartbeat span | Session-static facts repeated per emission | `Sentry.setAttributes` once at init, plus one-shot gauges for fleet segmentation |
| 7 | Heap looks fine until the tab dies; leak not localized to a screen | No screen context, no retained-delta, values stuffed into attributes, `danger_zone` on every tick above 0.70 | Adaptive sampling, crossing-only `danger_zone`, `instrumentedPhase` / `trackScreenRetention`, UAS for non-heap memory |
| 8 | Can't tell which stream caused a memory spike | Streaming spans unparented, duration as a span, no memory samples during playback | Parent `streaming.session` span; `streaming.session.duration` distribution inside teardown; sample `app.memory.utilization` with that span active so the metric is trace-connected to the session |

## Heap caveats

`performance.memory` is **Chromium-only** and **heap-only**. It excludes video
decode buffers, DOM, and image caches, so a streaming client can sit near its
OOM ceiling while `app.memory.utilization` looks healthy. `app.memory.total_uas`
exists to cover that gap: it is `performance.measureUserAgentSpecificMemory()`,
feature-detected, called at most once per route change, and silent when
cross-origin isolation is missing.

Chrome also **quantizes** `performance.memory` values. For local development,
launch Chrome with `--enable-precise-memory-info` so the on-screen readout and
the numbers in Sentry are comparable.

This demo caps utilization at a **256 MB device heap** (`setHeapLimitCap`)
so the pressure slider can cross 0.70. Production copies of
`src/instrumentation/memory.ts` should leave that unset and use the real
`jsHeapSizeLimit`.

## What to look at in Sentry

- `avg(app.memory.utilization)` grouped by `session_elapsed_min` — rising across
  `0-5` → `5-15` → … is the leak signature
- `p95(app.memory.delta)` grouped by `phase` — ranks which phases allocate most
  (`catalog_load`, `detail_load`, `player_start`)
- `p95(app.memory.retained_delta)` grouped by `screen` — isolates the leaking
  screen (`player` with the leak toggle on)
- `count(app.memory.danger_zone)` grouped by `release`

The join this repo exists to demonstrate: during playback, utilization samples
are emitted inside the `streaming.session` span (same `session_id`). A memory
anomaly during a stream resolves to the session that caused it.

## Monitors

1. **Static threshold** on `avg(app.memory.utilization) > 0.85`
2. **Anomaly detection** on `p95(app.memory.utilization)` grouped by `release`

## Layout

```
src/sentry.ts                 init, ignoreSpans, beforeSendMetric
src/instrumentation/memory.ts copyable memory module (Pattern 7)
src/instrumentation/          corrected Patterns 1–6 and 8
src/antipatterns/             broken counterparts, header comment = Sentry symptom
```

Copy `src/instrumentation/memory.ts` into another app as-is. It has no
app-specific imports.
