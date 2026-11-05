"use client";

/**
 * Small bridge to the native app shell (Capacitor plugins on iOS/Android). Every call is a
 * no-op in a normal browser and in older app builds that lack the plugin.
 */

type Splash = { hide(options?: { fadeOutDuration?: number }): Promise<void> };
type Haptics = {
  impact(options: { style: "LIGHT" | "MEDIUM" | "HEAVY" }): Promise<void>;
  notification(options: { type: "SUCCESS" | "WARNING" | "ERROR" }): Promise<void>;
};

// Plugins stay boxed ({ p }) until called: a Capacitor plugin is a proxy that throws on .then, so
// a promise resolving to it directly fails ("Haptics.then() is not implemented on ios") and the call is lost
const plugins = new Map<string, Promise<{ p: unknown } | null>>();

function plugin<T>(name: string): Promise<{ p: T } | null> {
  if (!plugins.has(name)) {
    plugins.set(
      name,
      (async () => {
        // The native bridge defines window.Capacitor before the page's own scripts run
        if (typeof window === "undefined" || !("Capacitor" in window)) return null;
        const { Capacitor, registerPlugin } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable(name)) return null;
        return { p: registerPlugin<T>(name) };
      })().catch(() => null),
    );
  }
  return plugins.get(name) as Promise<{ p: T } | null>;
}

export async function hideSplash() {
  const splash = (await plugin<Splash>("SplashScreen"))?.p;
  await splash?.hide({ fadeOutDuration: 300 }).catch(() => {});
}

export function haptic(kind: "tap" | "press" | "success") {
  void plugin<Haptics>("Haptics")
    .then((box) => (kind === "success" ? box?.p.notification({ type: "SUCCESS" }) : box?.p.impact({ style: kind === "tap" ? "LIGHT" : "MEDIUM" })))
    .catch(() => {});
}
