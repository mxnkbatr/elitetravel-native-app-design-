import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The app is a native shell around the live website: everything shipped to the site
 * shows up in the app on next launch, no store update needed.
 * Point APP_URL at the deployed site (production or a preview) before `npx cap sync`.
 */
// The app loads its own deployment of this project (the app design), not the public website.
// Replace with the Vercel domain of this project once it is deployed.
const APP_URL = process.env.APP_URL ?? "https://elitetravel-app.vercel.app";

const config: CapacitorConfig = {
  appId: "mn.elitetravel.app",
  appName: "Elite Travel",
  webDir: "www",
  // Lets the site recognise the app before any script runs (skip the web intro, app-only screens)
  appendUserAgent: "EliteTravelApp/1.1",
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
      // The site hides the splash once its first screen has painted; this is only the fallback
      launchShowDuration: 10000,
      launchAutoHide: true,
      launchFadeOutDuration: 350,
      backgroundColor: "#0b241d",
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
