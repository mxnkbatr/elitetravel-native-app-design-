import { NewsEditor } from "@/app/admin/(panel)/news/[id]/NewsEditor";
import type { NewsItem } from "@/data/news";
import type { Tour } from "@/data/tours";
import { requireAdmin } from "@/lib/server/auth";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { notFound } from "next/navigation";

const blank: NewsItem = { id: "", category: "Мэдээ", title: "", excerpt: "", body: [], image: "", readMin: 2 };

export default async function AdminNewsItemPage({ params }: PageProps<"/admin/news/[id]">) {
  await requireAdmin("content.manage");
  const { id } = await params;
  const db = supabaseAdmin()!;
  const [{ data: tourRows }, { data }] = await Promise.all([
    db.from("tours").select("data").order("position"),
    id === "new" ? Promise.resolve({ data: { data: blank } }) : db.from("news").select("data").eq("id", id).maybeSingle(),
  ]);
  if (!data) notFound();
  const tours = (tourRows ?? []).map((r) => {
    const t = r.data as Tour;
    return { id: t.id, title: t.title };
  });
  return <NewsEditor initial={data.data as NewsItem} originalId={id === "new" ? null : id} tours={tours} />;
}
