import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { patterns } from "../active";
import { fetchTitle, type Title } from "../data/catalog";
import { isLeakEnabled, retainLeakedSession } from "../demo/leak";
import { CYCLE_QUALITY_EVENT } from "../demo/traffic";
import { PROVIDER_NAME } from "../lib/provider";

const QUALITIES = ["480p", "720p", "1080p"] as const;
const LEAK_BYTES = 8 * 1024 * 1024;

function allocateRetainedChunk(bytes: number): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < view.length; i += 4096) {
    view[i] = 1;
  }
  return buffer;
}

export function Player() {
  const { id = "" } = useParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [title, setTitle] = useState<Title | null>(null);
  const [quality, setQuality] = useState<(typeof QUALITIES)[number]>("720p");

  useEffect(() => {
    let cancelled = false;
    void fetchTitle(id).then((result) => {
      if (!cancelled) {
        setTitle(result ?? null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const stopRetention = patterns().trackScreenRetention("player");
    const leak = isLeakEnabled();
    const chunks = [allocateRetainedChunk(LEAK_BYTES)];
    const video = videoRef.current;
    const onTimeUpdate: EventListener = () => {
      void chunks[0]?.byteLength;
    };
    video?.addEventListener("timeupdate", onTimeUpdate);

    if (leak) {
      retainLeakedSession({
        chunks,
        listeners: video
          ? [{ target: video, type: "timeupdate", listener: onTimeUpdate }]
          : [],
      });
    }

    let cancelled = false;
    void patterns().instrumentedPhase("player_start", async () => {
      await patterns().connectProvider(PROVIDER_NAME);
      if (!cancelled) {
        patterns().startStreamingSession(id, "720p");
      }
    }).then(() => {
      if (!cancelled) {
        patterns().emitMarker("player/READY");
      }
    });

    return () => {
      cancelled = true;
      stopRetention();
      void patterns().teardownStreamingSession();
      void patterns().disconnectProvider();
      if (!leak) {
        video?.removeEventListener("timeupdate", onTimeUpdate);
        chunks.length = 0;
      }
    };
  }, [id]);

  async function onQuality(next: (typeof QUALITIES)[number]) {
    setQuality(next);
    await patterns().changeStreamQuality(next);
  }

  useEffect(() => {
    const onCycle = () => {
      const current = QUALITIES.includes(quality) ? quality : "720p";
      const next = QUALITIES[(QUALITIES.indexOf(current) + 1) % QUALITIES.length];
      void onQuality(next);
    };
    window.addEventListener(CYCLE_QUALITY_EVENT, onCycle);
    return () => window.removeEventListener(CYCLE_QUALITY_EVENT, onCycle);
  }, [quality]);

  return (
    <main className="page">
      <p className="crumb">
        <Link to="/">Catalog</Link>
        {title ? (
          <>
            {" / "}
            <Link to={`/title/${title.id}`}>{title.title}</Link>
          </>
        ) : null}
        {" / Watch"}
      </p>
      <h1>{title?.title ?? "Loading…"}</h1>
      <video
        ref={videoRef}
        className="player"
        src="/sample.mp4"
        controls
        loop
        muted
        autoPlay
        playsInline
      />
      <div className="quality">
        {QUALITIES.map((option) => (
          <button
            key={option}
            type="button"
            className={option === quality ? "active" : ""}
            onClick={() => void onQuality(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <p className="muted">
        Simulated buffer manager holds a decoded chunk while this screen is
        mounted. With the leak toggle on, that chunk (~8MB) plus the
        timeupdate listener are pushed to a module-level array and never
        cleared.
      </p>
    </main>
  );
}
