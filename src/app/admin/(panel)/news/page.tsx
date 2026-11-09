import { AdminTitle, titleActionClass } from "@/app/admin/(panel)/AdminTitle";
import { ContentList } from "@/app/admin/(panel)/ContentList";
import type { NewsItem } from "@/data/news";
import { requireAdmin } from "@/lib/server/auth";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import Link from "next/link";

export default async function AdminNewsPage() {
  await requireAdmin("content.manage");
  const { data } = await supabaseAdmin()!.from("news").select("id, data").order("position").order("id");
  const news = (data ?? []).map((r) => r.data as NewsItem);

  return (
    <>
      <AdminTitle
        title="Мэдээ"
        sub="Мэдээ бичих, засах. Эхний 3 нь нүүр дээр онцлогдоно."
        action={
          <Link href="/admin/news/new" className={titleActionClass}>
            + Мэдээ бичих
          </Link>
        }
      />
      <ContentList
        table="news"
        items={news.map((n) => ({ id: n.id, title: n.title, sub: n.excerpt, image: n.image, badge: n.category }))}
      />
    </>
  );
}
