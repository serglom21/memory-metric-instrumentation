import { getMode } from "./mode";
import * as correct from "./instrumentation";
import * as broken from "./antipatterns";

export type AppInstrumentation = typeof correct;

export function patterns(): AppInstrumentation {
  return getMode() === "antipattern" ? broken : correct;
}

export function restartForMode(): void {
  correct.stopMemory();
  broken.stopMemory();
  const active = patterns();
  active.installSessionFacts();
  active.startMemory();
}
