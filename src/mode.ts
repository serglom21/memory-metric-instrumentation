export type InstrumentationMode = "antipattern" | "correct";

const STORAGE_KEY = "mmi.instrumentationMode";

function readStoredMode(): InstrumentationMode {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === "antipattern" || stored === "correct") {
      return stored;
    }
  } catch {
    // sessionStorage can throw in some isolation contexts
  }
  return "correct";
}

let mode: InstrumentationMode = readStoredMode();
const listeners = new Set<() => void>();

export function getMode(): InstrumentationMode {
  return mode;
}

export function setMode(next: InstrumentationMode): void {
  mode = next;
  try {
    sessionStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore quota / isolation failures
  }
  listeners.forEach((listener) => listener());
}

export function subscribeMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
