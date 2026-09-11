import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMode, setMode, type InstrumentationMode } from "../mode";
import { setPressureMb } from "./pressure";
import {
  TITLE_COUNT,
  bumpTrafficLoop,
  isTrafficEnabled,
  requestQualityCycle,
  subscribeTraffic,
} from "./traffic";

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = window.setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(id);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

async function ignoreAbort(run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return;
    }
    throw error;
  }
}

export function TrafficDriver() {
  const navigate = useNavigate();
  const [on, setOn] = useState(isTrafficEnabled);
  const homeModeRef = useRef<InstrumentationMode>(getMode());

  useEffect(() => subscribeTraffic(() => setOn(isTrafficEnabled())), []);

  useEffect(() => {
    if (!on) {
      homeModeRef.current = getMode();
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    homeModeRef.current = getMode();

    void ignoreAbort(async () => {
      let i = 0;
      while (!signal.aborted) {
        const id = String((i % TITLE_COUNT) + 1);
        const mixAntipattern = i % 5 === 4;
        setMode(mixAntipattern ? "antipattern" : homeModeRef.current);
        // Spike above 0.70 of the 256MB demo ceiling, then drop below 0.60
        // so the next spike is a fresh crossing (hysteresis).
        setPressureMb(i % 3 === 0 ? 200 : 40);

        navigate(`/title/${id}`);
        await sleep(1_300, signal);
        navigate(`/watch/${id}`);
        await sleep(8_000, signal);
        requestQualityCycle();
        await sleep(8_000, signal);
        navigate("/");
        await sleep(1_500, signal);
        window.dispatchEvent(new Event("pagehide"));
        bumpTrafficLoop();
        i += 1;
      }
    }).finally(() => {
      setMode(homeModeRef.current);
    });

    return () => {
      controller.abort();
    };
  }, [on, navigate]);

  return null;
}
