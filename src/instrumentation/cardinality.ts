/**
 * Pattern 3 — Stable span descriptions (correct)
 *
 * One description per operation. Variable parts (locale, route, provider)
 * live on attributes so cardinality stays bounded.
 */
import * as Sentry from "@sentry/react";
import { routeTemplate } from "../lib/screen";
import { provider } from "../lib/provider";

export async function withCatalogFetch<T>(
  locale: { id: string; label: string },
  fn: () => Promise<T>,
): Promise<T> {
  return Sentry.startSpan(
    {
      name: "query.fetch.catalog",
      op: "query",
      attributes: { locale: locale.id },
    },
    fn,
  );
}

export function onPageNavigation(pathname: string): void {
  Sentry.startSpan(
    {
      name: "PageNavigation",
      op: "navigation.manual",
      attributes: { "page.route": routeTemplate(pathname) },
    },
    () => undefined,
  );
}

export async function connectProvider(providerName: string): Promise<void> {
  await Sentry.startSpan(
    {
      name: "ConnectProvider",
      op: "stream.connect",
      attributes: { "provider.name": providerName },
    },
    async () => {
      await provider.connect();
    },
  );
}
