import { TourEditor } from "@/app/admin/(panel)/tours/[id]/TourEditor";
import type { Tour } from "@/data/tours";
import { requireAdmin } from "@/lib/server/auth";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { notFound } from "next/navigation";

const blank: Tour = {
  id: "",
  title: "",
  destination: "",
  destinationKey: "hainan",
  description: "",
  story: "",
  price: null,
  duration: "",
  nights: null,
  image: "",
  gallery: [],
  highlights: [],
  includes: [],
  excludes: [],
  itinerary: [],
};

export default async function AdminTourPage({ params }: PageProps<"/admin/tours/[id]">) {
  await requireAdmin("content.manage");
  const { id } = await params;
  if (id === "new") return <TourEditor initial={blank} originalId={null} />;
  const { data } = await supabaseAdmin()!.from("tours").select("data").eq("id", id).maybeSingle();
  if (!data) notFound();
  return <TourEditor initial={data.data as Tour} originalId={id} />;
}
