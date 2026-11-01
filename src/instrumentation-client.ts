/**
 * Browser errors from our own code are sent to /api/client-error (shown in /admin/errors).
 * At most 5 reports per page load; noise from extensions and benign browser warnings is skipped.
 */
const IGNORED = /ResizeObserver loop|Script error\.?$|Non-Error promise rejection|AbortError|Load failed|Failed to fetch|NetworkError/i;
let sent = 0;

function report(message: string, stack?: string, source?: string) {
  try {
    if (sent >= 5 || !message || IGNORED.test(message)) return;
    if (source && !source.startsWith(location.origin)) return;
    sent++;
    const body = JSON.stringify({ message: message.slice(0, 1000), stack: stack?.slice(0, 1500), path: location.pathname, ua: navigator.userAgent.slice(0, 200) });
    if (!navigator.sendBeacon?.("/api/client-error", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/client-error", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  } catch {
    // reporting must never break the page
  }
}

window.addEventListener("error", (e) => report(e.message, e.error instanceof Error ? e.error.stack : undefined, e.filename));
window.addEventListener("unhandledrejection", (e) => {
  const r = e.reason;
  report(r instanceof Error ? `${r.name}: ${r.message}` : String(r), r instanceof Error ? r.stack : undefined);
});
