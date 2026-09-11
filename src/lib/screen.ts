export function screenFromPath(pathname: string): string {
  if (pathname === "/") {
    return "catalog";
  }
  if (pathname.startsWith("/title/")) {
    return "detail";
  }
  if (pathname.startsWith("/watch/")) {
    return "player";
  }
  return "unknown";
}

export function routeTemplate(pathname: string): string {
  if (pathname === "/") {
    return "/";
  }
  if (pathname.startsWith("/title/")) {
    return "/title/:id";
  }
  if (pathname.startsWith("/watch/")) {
    return "/watch/:id";
  }
  return pathname;
}
