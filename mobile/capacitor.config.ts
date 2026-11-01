import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The app is a native shell around the live website: everything shipped to the site
 * shows up in the app on next launch, no store update needed.
 * Point APP_URL at the deployed site (production or a preview) before `npx cap sync`.
 */
const APP_URL = process.env.APP_URL ?? "https://elitetravel-mn-wg6y.vercel.app";

const config: CapacitorConfig = {
  appId: "mn.elitetravel.app",
  appName: "Elite Travel",
  webDir: "www",
  server: {
    url: APP_URL,
    cleartext: false,
    // Shown from the bundle when the site cannot be reached (offline, DNS, 5xx)
    errorPath: "offline.html",
    androidScheme: "https",
  },
  android: {
    backgroundColor: "#eef5f2",
    allowMixedContent: false,
    // Native feel: no pinch-zoom, no "Open in browser" link previews
    webContentsDebuggingEnabled: false,
  },
  ios: {
    backgroundColor: "#eef5f2",
    contentInset: "never",
    limitsNavigationsToAppBoundDomains: false,
  },
  experimental: {
    ios: {
      spm: {
        // Avoids a SwiftPM package identity collision with the Firebase SDK
        packageOptions: { "@capacitor-firebase/messaging": { symlink: true } },
      },
    },
  },
  plugins: {
    FirebaseMessaging: {
      presentationOptions: ["alert", "badge", "sound"],
    },
    SplashScreen: {
      launchShowDuration: 1400,
      launchAutoHide: true,
      launchFadeOutDuration: 400,
      backgroundColor: "#062a2a",
      showSpinner: false,
      androidScaleType: "CENTER_INSIDE",
      splashFullScreen: false,
      splashImmersive: false,
    },
    StatusBar: {
      // Dark icons on the light page background
      style: "LIGHT",
      backgroundColor: "#eef5f2",
      overlaysWebView: false,
    },
  },
};

export default config;
