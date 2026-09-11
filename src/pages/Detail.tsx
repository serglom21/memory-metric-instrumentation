import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { patterns } from "../active";
import { fetchTitle, getHero, type Title } from "../data/catalog";

export function Detail() {
  const { id = "" } = useParams();
  const [title, setTitle] = useState<Title | null | undefined>(undefined);

  useEffect(() => {
    const stopRetention = patterns().trackScreenRetention("detail");
    let cancelled = false;

    void patterns().instrumentedPhase("detail_load", () =>
      patterns().withUserTiming("detail_load", () => fetchTitle(id)),
    ).then((result) => {
      if (!cancelled) {
        setTitle(result ?? null);
      }
    });

    return () => {
      cancelled = true;
      stopRetention();
    };
  }, [id]);

  if (title === undefined) {
    return (
      <main className="page">
        <p>Loading title…</p>
      </main>
    );
  }

  if (!title) {
    return (
      <main className="page">
        <p>Title not found.</p>
        <Link to="/">Back to catalog</Link>
      </main>
    );
  }

  return (
    <main className="page">
      <p className="crumb">
        <Link to="/">Catalog</Link> / {title.title}
      </p>
      <img className="hero" src={getHero(title)} alt="" />
      <h1>
        {title.title}{" "}
        <span className="muted">{title.year}</span>
      </h1>
      <p className="genres">{title.genres.join(" · ")}</p>
      <p className="synopsis">{title.synopsis}</p>
      <p>
        <Link className="play" to={`/watch/${title.id}`}>
          Play
        </Link>
      </p>
      <h2>Episodes</h2>
      <ol className="episodes">
        {title.episodes.map((episode) => (
          <li key={episode.id}>
            {episode.name}
            <span className="muted"> {episode.durationMin} min</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
