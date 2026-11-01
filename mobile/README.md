# Elite Travel — mobile app

Capacitor WebView shell around the deployed website. The website is the rest of this
repo and is never touched from here: anything deployed to the site shows up in the
app on next launch, no store update needed.

What makes it feel like an app rather than the site in Safari:

- `www/native-shell.js` is injected into every page (iOS: `WKUserScript` in
  `ios/App/App/SceneDelegate.swift`; Android: `MainActivity.java`). It adds the `elite-app` class
  on `<html>`, kills tap highlight / long-press callouts / text selection / pinch zoom and rubber-band.
- Native swipe-back on iOS, no link previews, portrait only, own splash and icon.
- `www/offline.html` is shown when there is no connection and retries automatically.

## Site URL

Set once in `capacitor.config.ts` (`APP_URL`), or per build:

```bash
APP_URL=https://your-deployed-site.vercel.app npx cap sync
```

Run `npx cap sync` after any change to `capacitor.config.ts` or `www/`.

## iOS (needs a Mac with Xcode 16+)

1. `npm install && npx cap sync ios`
2. `npx cap open ios`
3. In Xcode → target **App** → Signing & Capabilities → pick your Apple Developer team
   (bundle id `mn.elitetravel.app`).
4. Run on a device to test.
5. Product → Archive → Distribute App → App Store Connect → upload.
6. In App Store Connect create the app (same bundle id), add screenshots, privacy info, submit for review.

Note: Apple rejects apps that are "just a website" (guideline 4.2). The native shell helps; adding
something native (push notifications, Face ID, offline saved bookings) makes approval more likely.

### No Mac: Codemagic

`codemagic.yaml` (repo root) builds when a push to `master` touches `mobile/`, and uploads to
TestFlight. Web-only pushes skip it: the app already loads the live site. One-time setup:

1. App Store Connect → Users and Access → Integrations → App Store Connect API → generate a key
   with **App Manager** access; download the `.p8`, note Issuer ID and Key ID.
2. Apple Developer → Identifiers → register bundle id `mn.elitetravel.app`, then in App Store
   Connect create the app with that bundle id.
3. Codemagic → Team settings → Integrations → Developer Portal → add the key, name it
   **Elite Travel ASC** (must match `codemagic.yaml`).
4. Codemagic → Add application → this GitHub repo → it picks up `codemagic.yaml` → Start build.

## Push notifications (iOS)

Firebase Cloud Messaging via `@capacitor-firebase/messaging`. The site asks for permission
from a tap (traveller: «Мэдэгдэл асаах» card on the booking page; staff: the bell in /admin)
and registers the device at `/api/push`. The server sends with the service account in the
site's `FIREBASE_*` env vars.

Already in the project: the plugin, `ios/App/App/GoogleService-Info.plist`, `App.entitlements`
(`aps-environment`), the `remote-notification` background mode and the AppDelegate hooks.
One-time setup outside the code:

1. Apple Developer → Identifiers → `mn.elitetravel.app` → enable **Push Notifications** → Save.
   Existing provisioning profiles become invalid; delete the old App Store profile so Codemagic
   creates a new one that includes push.
2. Apple Developer → Keys → **+** → enable **Apple Push Notifications service (APNs)** → download
   the `.p8` (only once), note the Key ID and your Team ID.
3. Firebase Console → Project settings → Cloud Messaging → Apple app configuration →
   **APNs Authentication Key** → upload the `.p8` with Key ID and Team ID.
4. Push to `master` (touching `mobile/`) so Codemagic builds a new TestFlight version, then submit
   it for review. The version without the plugin keeps working; it just shows no push prompt.

`ios/App/CapApp-SPM/symlinks/` is machine-specific and recreated by `npx cap sync ios`.

## Android

Needs JDK 21 (Gradle here does not run on JDK 25) and the Android SDK.

```bash
cd android
JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot" ./gradlew assembleDebug
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`. `android/local.properties` must use
forward slashes: `sdk.dir=C:/Users/User/AppData/Local/Android/Sdk`.

## Icons / splash

Replace `assets/source-logo.png`, then `npx @capacitor/assets generate`.
