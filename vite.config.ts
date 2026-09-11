import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// COOP + COEP put the page in a cross-origin isolated context so
// performance.measureUserAgentSpecificMemory() is allowed. Without these
// headers the API is undefined and app.memory.total_uas never fires.
const isolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

export default defineConfig({
  plugins: [react()],
  server: { headers: isolationHeaders },
  preview: { headers: isolationHeaders },
});
