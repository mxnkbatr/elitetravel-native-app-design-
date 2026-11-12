/** Shared by the root layout (server) and IntroCurtain (client) — keep this module plain. */
export const INTRO_KEY = "elite-intro-seen";

/**
 * Runs before paint (inlined in <head>):
 * - marks the native app (`data-app` on <html>) so app-only styles apply on the first frame;
 * - flags a first visit this session so the curtain already covers the page — no content flash.
 * This deployment serves only the native app, so app mode is always on (the public website is a
 * separate project). The app has its own native splash, so it never gets the curtain. Neither does /admin:
 * nothing there lifts it, so staff would face a blank, locked screen.
 */
export const introBootScript = `try{var d=document.documentElement,a=true;if(a)d.dataset.app="1";if(!a&&location.pathname.indexOf("/admin")!==0&&!sessionStorage.getItem("${INTRO_KEY}")&&!matchMedia("(prefers-reduced-motion: reduce)").matches){d.dataset.intro="1"}}catch(e){}`;
