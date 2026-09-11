/**
 * Pattern 3 — High-cardinality span descriptions (ANTIPATTERN)
 *
 * Symptom in Sentry: unbounded unique span names —
 * `query.fetch.catalog - English (United States)`,
 * `PageNavigation-/title/42`, `ConnectProvider-mock-cdn`.
 * Variable data is interpolated into the description instead of attributes.
 */
import * as Sentry from "@sentry/react";
import { provider } from "../lib/provider";

export async function withCatalogFetch<T>(
  locale: { id: string; label: string },
  fn: () => Promise<T>,
): Promise<T> {
  return Sentry.startSpan(
    {
      name: `query.fetch.catalog - ${locale.label}`,
      op: "query",
    },
    fn,
  );
}

export function onPageNavigation(pathname: string): void {
  Sentry.startSpan(
    {
      name: `PageNavigation-${pathname}`,
      op: "navigation.manual",
    },
    () => undefined,
  );
}

export async function connectProvider(providerName: string): Promise<void> {
  await Sentry.startSpan(
    {
      name: `ConnectProvider-${providerName}`,
      op: "stream.connect",
    },
    async () => {
      await provider.connect();
    },
  );
}
