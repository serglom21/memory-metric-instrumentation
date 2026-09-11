import * as Sentry from "@sentry/react";
import * as React from "react";
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router-dom";

function parameterizedPath(path: string): string {
  return path.replace(/\/\d+/g, "/:id").replace(/\/[0-9a-f-]{8,}/gi, "/:id");
}

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  release: import.meta.env.VITE_SENTRY_RELEASE ?? "memory-metric-instrumentation@0.1.0",
  environment:
    import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
  tracesSampleRate: 1.0,

  // Application Metrics are enabled by default in JS SDKs 10.25+.
  // No flag is required to start emitting Sentry.metrics.*.
  //
  // To disable entirely:
  //   enableMetrics: false,

  integrations: [
    Sentry.reactRouterV7BrowserTracingIntegration({
      useEffect: React.useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
      beforeStartSpan(context) {
        return {
          ...context,
          name: parameterizedPath(context.name ?? window.location.pathname),
        };
      },
    }),
  ],

  // Drop User Timing `measure` spans injected by browser extensions and
  // Zone.js. In a real app this is often the single largest quota item:
  // they are high-volume, near-zero-signal, and unbounded by route.
  ignoreSpans: [
    { op: "measure", name: /^Zone(?::|$)/i },
    { op: "measure", name: /chrome-extension:\/\//i },
    { op: "measure", name: /\/\/Extension\b/ },
  ],
  beforeSendTransaction(event) {
    const name = event.transaction ?? "";
    const op = event.contexts?.trace?.op;
    if (op === "measure" && /chrome-extension|zone(?:\.js)?/i.test(name)) {
      return null;
    }
    return event;
  },

  beforeSendMetric(metric) {
    // Illustration of metric filtering: drop memory metrics when the leak
    // toggle is off. Left commented so the leak-off demo still reports
    // retained_delta ≈ 0.
    //
    //   import { isLeakEnabled } from "./demo/leak";
    //   if (metric.name.startsWith("app.memory.") && !isLeakEnabled()) {
    //     return null;
    //   }
    if (metric.name.startsWith("debug.")) {
      return null;
    }
    return metric;
  },
});
