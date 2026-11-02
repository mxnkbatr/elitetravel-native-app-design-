"use client";

import type { AccountProfile, AccountState } from "@/lib/account-types";
import { biometricSignIn } from "@/lib/biometric";
import { bookingTokens, mergeAccount, savedTours } from "@/lib/traveller-store";
import { useSyncExternalStore } from "react";

/**
 * The traveller's account in the browser: who is signed in, loaded once per page load and
 * shared by the header, the profile sheet and /account. Signing in pulls the account's
 * bookings onto this device and attaches this device's bookings to the account.
 */

type Snapshot = { status: "loading" | "guest" | "user"; profile: AccountProfile | null };

const LOADING: Snapshot = { status: "loading", profile: null };
let snapshot: Snapshot = LOADING;
let started = false;
const listeners = new Set<() => void>();

function set(next: Snapshot) {
  snapshot = next;
  listeners.forEach((l) => l());
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Алдаа гарлаа. Дахин оролдоно уу.");
  return data;
}

function apply(state: AccountState) {
  if (!state.user) return set({ status: "guest", profile: null });
  mergeAccount(state.bookings, state.user.saved);
  set({ status: "user", profile: state.user });
}

/** Device → account: attach this device's bookings and save the merged list of saved tours. */
async function pushDevice() {
  apply(await call<AccountState>("/api/account", { method: "PATCH", body: JSON.stringify({ tripTokens: bookingTokens(), saved: savedTours() }) }));
}

function load() {
  if (started) return;
  started = true;
  void call<AccountState>("/api/account")
    .then(async (state) => {
      apply(state);
      if (state.user) await pushDevice();
    })
    .catch(() => set({ status: "guest", profile: null }));
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  load();
  return () => listeners.delete(cb);
}

export function useAccount() {
  return useSyncExternalStore(subscribe, () => snapshot, () => LOADING);
}

export async function requestCode(email: string) {
  await call("/api/account/code", { method: "POST", body: JSON.stringify({ email }) });
}

export async function verifyCode(email: string, code: string, name?: string) {
  apply(await call<AccountState>("/api/account/verify", { method: "POST", body: JSON.stringify({ email, code, name }) }));
  await pushDevice();
}

/** Face ID instead of an emailed code (native app, after Face ID was turned on in the profile). */
export async function faceIdSignIn() {
  apply(await biometricSignIn<AccountState & { secret: string }>("traveller"));
  await pushDevice();
}

export async function updateProfile(patch: { name?: string; phone?: string }) {
  apply(await call<AccountState>("/api/account", { method: "PATCH", body: JSON.stringify(patch) }));
}

/** Saved-tour changes made while signed in follow the traveller to other devices. */
export async function syncSaved() {
  if (snapshot.status !== "user") return;
  await call<AccountState>("/api/account", { method: "PATCH", body: JSON.stringify({ saved: savedTours() }) }).catch(() => {});
}

export async function logout() {
  await call("/api/account/logout", { method: "POST" });
  set({ status: "guest", profile: null });
}

export async function deleteAccount() {
  await call("/api/account", { method: "DELETE" });
  set({ status: "guest", profile: null });
}
