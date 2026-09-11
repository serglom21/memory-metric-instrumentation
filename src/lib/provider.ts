import * as Sentry from "@sentry/react";
import { delay } from "./delay";

export const PROVIDER_NAME = "mock-cdn";

export const provider = {
  name: PROVIDER_NAME,

  async connect(): Promise<void> {
    await delay(280);
  },

  // Inner span is intentional: Pattern 2 is about the *caller* not awaiting
  // this promise. The child still takes ~226ms; the outer span's duration
  // is what tells you whether the application actually waited.
  async disconnect(): Promise<void> {
    await Sentry.startSpan(
      { name: "provider.disconnect.inner", op: "stream.disconnect.inner" },
      async () => {
        await delay(226);
      },
    );
  },

  async switchQuality(_quality: string): Promise<void> {
    await delay(90);
  },
};
