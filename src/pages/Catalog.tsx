import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { patterns } from "../active";
import {
  fetchCatalog,
  getPoster,
  LOCALE,
  type Title,
} from "../data/catalog";
import { noteFirstScreen } from "../firstScreen";

export function Catalog() {
  const [titles, setTitles] = useState<Title[] | null>(null);

  useEffect(() => {
    noteFirstScreen();
    const stopRetention = patterns().trackScreenRetention("catalog");
    let cancelled = false;

    void patterns().instrumentedPhase("catalog_load", () =>
      patterns().withUserTiming("catalog_load", () =>
        patterns().withCatalogFetch(LOCALE, fetchCatalog),
      ),
    ).then((result) => {
      if (cancelled) {
        return;
      }
      setTitles(result);
      patterns().emitMarker("catalog/FETCH_COMPLETE");
    });

    return () => {
      cancelled = true;
      stopRetention();
    };
  }, []);

  return (
    <main className="page">
      <h1>Catalog</h1>
      <p className="lede">
        {titles
          ? `${titles.length} titles. Open one, play it, come back — the leak demo depends on that loop.`
          : "Loading catalog…"}
      </p>
      <div className="grid">
        {(titles ?? []).map((title) => (
          <Link key={title.id} className="tile" to={`/title/${title.id}`}>
            <img src={getPoster(title)} alt="" width={160} height={240} />
            <span className="tile-title">{title.title}</span>
            <span className="tile-meta">{title.year}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
