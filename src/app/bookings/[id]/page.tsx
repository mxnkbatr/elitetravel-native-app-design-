import { TripView } from "@/components/TripView";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Миний захиалга", robots: { index: false } };

export default async function TripPage({ params }: PageProps<"/bookings/[id]">) {
  const { id } = await params;
  return <TripView id={id} />;
}
