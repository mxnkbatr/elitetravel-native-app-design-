"use client";

export type DevicePurpose = "traveller" | "staff";

/**
 * Face ID / Touch ID sign-in in the native app (@capgo/capacitor-native-biometric).
 * The device key lives in the Keychain with biometric access control, so reading it is
 * what shows the Face ID prompt. Browsers and app builds without the plugin get null/false.
 */

type Biometric = {
  isAvailable(): Promise<{ isAvailable: boolean; biometryType: number }>;
  verifyIdentity(options: { reason: string; title?: string }): Promise<void>;
  setCredentials(options: { username: string; password: string; server: string; accessControl?: number }): Promise<void>;
  getSecureCredentials(options: { server: string; reason?: string; title?: string }): Promise<{ username: string; password: string }>;
  deleteCredentials(options: { server: string }): Promise<void>;
};

const BIOMETRY_CURRENT_SET = 1;
const FACE_ID = 2;
const KEYCHAIN = { traveller: "mn.elitetravel.app.traveller", staff: "mn.elitetravel.app.staff" } as const;
/** Device key id, kept outside the Keychain so screens can tell Face ID is set up without a prompt */
const flag = (purpose: DevicePurpose) => `elite-faceid-${purpose}`;

let plugin: Promise<Biometric | null> | null = null;
function biometric() {
  plugin ??= (async () => {
    if (typeof window === "undefined" || !("Capacitor" in window)) return null;
    const { Capacitor, registerPlugin } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("NativeBiometric")) return null;
    return registerPlugin<Biometric>("NativeBiometric");
  })().catch(() => null);
  return plugin;
}

/** "Face ID" / "Touch ID" when this phone can use it, else null. */
export async function biometryName() {
  const b = await biometric();
  if (!b) return null;
  const r = await b.isAvailable().catch(() => null);
  if (!r?.isAvailable) return null;
  return r.biometryType === FACE_ID ? "Face ID" : r.biometryType === 1 ? "Touch ID" : "Биометр";
}

export const biometricEnabled = (purpose: DevicePurpose) => {
  try {
    return !!localStorage.getItem(flag(purpose));
  } catch {
    return false;
  }
};

async function api<T>(path: string, method: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method, cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Алдаа гарлаа. Дахин оролдоно уу.");
  return data;
}

/** Signed in already: confirm with Face ID, then register this phone and store its key. */
export async function enableBiometric(purpose: DevicePurpose) {
  const b = await biometric();
  if (!b) throw new Error("Энэ төхөөрөмж дээр Face ID ашиглах боломжгүй.");
  await b.verifyIdentity({ reason: "Face ID-аар нэвтрэхийг идэвхжүүлэх", title: "Elite Travel" });
  const { id, secret } = await api<{ id: string; secret: string }>("/api/account/device", "POST", { purpose, label: navigator.userAgent.includes("iPhone") ? "iPhone" : "Утас" });
  await b.setCredentials({ username: id, password: secret, server: KEYCHAIN[purpose], accessControl: BIOMETRY_CURRENT_SET });
  localStorage.setItem(flag(purpose), id);
}

/** Face ID prompt → server sign-in. Returns the server's JSON (traveller: account state). */
export async function biometricSignIn<T extends { secret: string }>(purpose: DevicePurpose): Promise<T> {
  const b = await biometric();
  if (!b) throw new Error("Энэ төхөөрөмж дээр Face ID ашиглах боломжгүй.");
  let creds: { username: string; password: string };
  try {
    creds = await b.getSecureCredentials({ server: KEYCHAIN[purpose], reason: "Elite Travel-д нэвтрэх", title: "Elite Travel" });
  } catch {
    throw new Error("Face ID баталгаажсангүй.");
  }
  try {
    const result = await api<T>("/api/account/device/login", "POST", { id: creds.username, secret: creds.password, purpose });
    await b.setCredentials({ username: creds.username, password: result.secret, server: KEYCHAIN[purpose], accessControl: BIOMETRY_CURRENT_SET });
    return result;
  } catch (e) {
    // A revoked or expired key will never work again: forget it so the button disappears
    if (/хугацаа дууссан|эрх олгогдоогүй/.test((e as Error).message)) await forget(purpose);
    throw e;
  }
}

async function forget(purpose: DevicePurpose) {
  localStorage.removeItem(flag(purpose));
  await (await biometric())?.deleteCredentials({ server: KEYCHAIN[purpose] }).catch(() => {});
}

/** Turns Face ID sign-in off on this phone and revokes its key on the server. */
export async function disableBiometric(purpose: DevicePurpose) {
  const id = localStorage.getItem(flag(purpose));
  await forget(purpose);
  if (id) await api("/api/account/device", "DELETE", { id, purpose }).catch(() => {});
}
