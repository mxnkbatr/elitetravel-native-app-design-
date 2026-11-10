"use client";

import { useEffect, useState } from "react";

/**
 * Lovable parity: first paint assumes the sale is running, then re-checks every second.
 * Used only for Bali's childSalePrice — adult priceValue never flips with the timer.
 */
export function useSaleActive(endsAt?: string | null): boolean {
  const [active, setActive] = useState(Boolean(endsAt));
  useEffect(() => {
    if (!endsAt) {
      setActive(false);
      return;
    }
    const check = () => setActive(new Date(endsAt).getTime() > Date.now());
    check();
    const id = window.setInterval(check, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);
  return endsAt ? active : false;
}
