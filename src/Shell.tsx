import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { patterns } from "./active";
import { DevPanel } from "./demo/DevPanel";
import { TrafficDriver } from "./demo/TrafficDriver";
import { screenFromPath } from "./lib/screen";

export function Shell() {
  const location = useLocation();

  useEffect(() => {
    const screen = screenFromPath(location.pathname);
    patterns().onPageNavigation(location.pathname);
    patterns().onScreenChange(screen);
    patterns().emitMarker("viewWillAppear");
  }, [location.pathname]);

  return (
    <div className="app">
      <header className="top">
        <Link to="/" className="brand">
          Demo
        </Link>
        <span className="tag">Sentry instrumentation reference</span>
      </header>
      <Outlet />
      <TrafficDriver />
      <DevPanel />
    </div>
  );
}
