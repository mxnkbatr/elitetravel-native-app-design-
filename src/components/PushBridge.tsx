"use client";

import { refreshPushBookings, startPush } from "@/lib/push-client";
import { bookingTokens, onTravellerChange } from "@/lib/traveller-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Native app only: opens tapped notifications and keeps the device's booking list current on the server. */
export function PushBridge() {
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    let stop = () => {};
    void startPush((path) => router.push(path)).then((cleanup) => (alive ? (stop = cleanup) : cleanup()));
    let last = bookingTokens().join();
    const off = onTravellerChange(() => {
      const now = bookingTokens().join();
      if (now === last) return;
      last = now;
      void refreshPushBookings();
    });
    return () => {
      alive = false;
      stop();
      off();
    };
  }, [router]);

  return null;
}
