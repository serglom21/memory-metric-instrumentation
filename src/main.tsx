import "./sentry";
import "./demo/constrainedHeap";

import { reactErrorHandler } from "@sentry/react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { patterns, restartForMode } from "./active";
import { subscribeMode } from "./mode";
import { router } from "./router";
import "./index.css";

patterns().installSessionFacts();
patterns().startBootstrap();
patterns().startMemory();
subscribeMode(() => {
  restartForMode();
});

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element #root is missing");
}

// StrictMode is omitted: double-mounting would fire retention cleanup early
// and double-push leaked buffers, which makes the memory demo non-deterministic.
createRoot(root, {
  onUncaughtError: reactErrorHandler(),
  onCaughtError: reactErrorHandler(),
  onRecoverableError: reactErrorHandler(),
}).render(<RouterProvider router={router} />);
