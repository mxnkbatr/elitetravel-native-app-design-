import type { BookingRequest } from "@/lib/traveller-store";

/** Shapes shared by /api/account and the browser. */

export type AccountProfile = { email: string; name: string; phone: string; saved: string[] };

export type AccountBooking = BookingRequest;

export type AccountState = { user: AccountProfile | null; bookings: AccountBooking[] };
