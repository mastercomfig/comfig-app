/**
 * Resolves a TC2 path depending on whether the site is running
 * under a /tc2 prefix (like on the comfig app dev server or comfig.app/tc2)
 * vs. at the root domain (like on teamcomtress.com in production).
 *
 * @param path The target relative path (e.g. "/", "/servers", "/feed#news").
 * @param currentPathname The current page's URL pathname (e.g. Astro.url.pathname or window.location.pathname).
 */
export function resolveTC2Path(path: string, currentPathname: string): string {
  const isDevOrSubdir = currentPathname.startsWith("/tc2");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  
  if (isDevOrSubdir) {
    if (cleanPath === "/") return "/tc2";
    return `/tc2${cleanPath}`;
  }
  
  return cleanPath;
}

/**
 * Resolves a link to the TC2 site.
 * On local dev servers, it links to the local /tc2 path.
 * In production, it links to teamcomtress.com.
 *
 * @param path The target relative path (e.g. "/", "/servers", "/feed#news").
 */
export function resolveTC2Link(path: string = "/"): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  
  if (import.meta.env.DEV) {
    if (cleanPath === "/") return "/tc2";
    return `/tc2${cleanPath}`;
  }
  
  if (cleanPath === "/") return "https://teamcomtress.com/";
  return `https://teamcomtress.com${cleanPath}`;
}

