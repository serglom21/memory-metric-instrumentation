import { setHeapLimitCap as setCorrectHeapLimitCap } from "../instrumentation/memory";
import { setHeapLimitCap as setBrokenHeapLimitCap } from "../antipatterns/memory";
import { setHeapLimitCap as setPanelHeapLimitCap } from "../lib/heap";

/** Desktop Chrome reports ~4GB jsHeapSizeLimit, so a 500MB slider never hits 0.70. */
export const DEMO_DEVICE_HEAP_BYTES = 256 * 1024 * 1024;

export function installDemoHeapCeiling(bytes = DEMO_DEVICE_HEAP_BYTES): void {
  setCorrectHeapLimitCap(bytes);
  setBrokenHeapLimitCap(bytes);
  setPanelHeapLimitCap(bytes);
}

installDemoHeapCeiling();
