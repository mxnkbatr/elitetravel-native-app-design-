import { AdminTitle, titleActionClass } from "@/app/admin/(panel)/AdminTitle";
import { ContentList } from "@/app/admin/(panel)/ContentList";
import { formatPrice, type Tour } from "@/data/tours";
import { requireAdmin } from "@/lib/server/auth";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import Link from "next/link";

export default async function AdminToursPage() {
  await requireAdmin("content.manage");
  const { data } = await supabaseAdmin()!.from("tours").select("id, data").order("position").order("id");
  const tours = (data ?? []).map((r) => r.data as Tour);

  return (
    <>
      <AdminTitle
        title="Аяллууд"
        sub="Дараалал нь сайт дээр харагдах дарааллаар. Хадгалмагц сайт, апп шууд шинэчлэгдэнэ."
        action={
          <Link href="/admin/tours/new" className={titleActionClass}>
            + Шинэ аялал
          </Link>
        }
      />
      <ContentList
        table="tours"
        items={tours.map((t) => ({
          id: t.id,
          title: t.title,
          sub: [t.destination, t.duration, formatPrice(t.price), t.dates].filter(Boolean).join(" · "),
          image: t.image,
          badge: t.unlisted ? "Нууц · туршилт" : t.status === "ended" ? "Дууссан" : t.tag === "soon" ? "Удахгүй" : t.tag === "sale" ? "Хямдрал" : t.tag === "hot" ? "Эрэлттэй" : undefined,
          muted: t.status === "ended",
        }))}
      />
    </>
  );
}
