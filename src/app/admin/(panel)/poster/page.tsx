import { AdminTitle } from "@/app/admin/(panel)/AdminTitle";
import { PosterTab } from "@/app/admin/(panel)/poster/PosterTab";
import type { Tour } from "@/data/tours";
import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/trips";

export default async function AdminPosterPage() {
  await requireAdmin("content.manage");
  const { data } = await db().from("tours").select("data").order("position").order("id");
  const tours = (data ?? []).map((r) => r.data as Tour).filter((t) => t.status !== "ended");

  return (
    <>
      <AdminTitle title="Постер" sub="Аялал сонгоход мэдээлэл автоматаар бөглөгдөнө. Засаад Instagram post (1080×1350) эсвэл story (1080×1920) PNG татна." />
      <PosterTab tours={tours} />
    </>
  );
}
