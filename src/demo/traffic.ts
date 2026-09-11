const STORAGE_KEY = "mmi.trafficStream";

export const TITLE_COUNT = 60;
export const CYCLE_QUALITY_EVENT = "mmi:cycle-quality";

let enabled = readInitial();
if (enabled) {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // ignore quota / isolation failures
  }
}
let loopsCompleted = 0;
const listeners = new Set<() => void>();
const loopListeners = new Set<() => void>();

function readInitial(): boolean {
  try {
    if (sessionStorage.getItem(STORAGE_KEY) === "1") {
      return true;
    }
  } catch {
    // sessionStorage can throw in some isolation contexts
  }
  try {
    return new URLSearchParams(window.location.search).get("stream") === "1";
  } catch {
    return false;
  }
}

export function isTrafficEnabled(): boolean {
  return enabled;
}

export function setTrafficEnabled(next: boolean): void {
  enabled = next;
  try {
    sessionStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // ignore quota / isolation failures
  }
  listeners.forEach((listener) => listener());
}

export function subscribeTraffic(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getTrafficLoops(): number {
  return loopsCompleted;
}

export function bumpTrafficLoop(): void {
  loopsCompleted += 1;
  loopListeners.forEach((listener) => listener());
}

export function subscribeTrafficLoops(listener: () => void): () => void {
  loopListeners.add(listener);
  return () => {
    loopListeners.delete(listener);
  };
}

export function requestQualityCycle(): void {
  window.dispatchEvent(new Event(CYCLE_QUALITY_EVENT));
}
