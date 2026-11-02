/** Shared by the root layout (server) and IntroCurtain (client) — keep this module plain. */
export const INTRO_KEY = "elite-intro-seen";

/**
 * Runs before paint (inlined in <head>): flags a first visit this session so the
 * curtain is already covering the page on the very first frame — no content flash.
 * Never on /admin: nothing there lifts the curtain, so staff would face a blank, locked screen.
 */
export const introBootScript = `try{if(location.pathname.indexOf("/admin")!==0&&!sessionStorage.getItem("${INTRO_KEY}")&&!matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.dataset.intro="1"}}catch(e){}`;
