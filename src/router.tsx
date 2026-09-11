import * as Sentry from "@sentry/react";
import { createBrowserRouter } from "react-router-dom";
import { Shell } from "./Shell";
import { Catalog } from "./pages/Catalog";
import { Detail } from "./pages/Detail";
import { Player } from "./pages/Player";

const sentryCreateBrowserRouter = Sentry.wrapCreateBrowserRouterV7(
  createBrowserRouter,
);

export const router = sentryCreateBrowserRouter([
  {
    path: "/",
    element: <Shell />,
    children: [
      { index: true, element: <Catalog /> },
      { path: "title/:id", element: <Detail /> },
      { path: "watch/:id", element: <Player /> },
    ],
  },
]);
