/** Shared by the root layout (server, boot script) and the theme picker (client) — keep this module plain. */
export const THEME_KEY = "elite-theme";

export type Theme = "light" | "dark" | "system";

/**
 * Runs before paint (inlined in <head>): applies the saved theme so a dark page never flashes white.
 * Light is the default until the visitor picks otherwise; /admin keeps its own light palette.
 */
export const themeBootScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(location.pathname.indexOf("/admin")!==0&&(t==="dark"||t==="system"))document.documentElement.dataset.theme=t}catch(e){}`;

const listeners = new Set<() => void>();

export function readTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "dark" || t === "system" ? t : "light";
  } catch {
    return "light";
  }
}

export function setTheme(theme: Theme) {
  try {
    if (theme === "light") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* private mode: applies for this page only */
  }
  const root = document.documentElement;
  if (theme === "light") delete root.dataset.theme;
  else root.dataset.theme = theme;
  // The browser / status bar colour follows along
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#061917" : "#eef5f2");
  listeners.forEach((l) => l());
}

export function subscribeTheme(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
