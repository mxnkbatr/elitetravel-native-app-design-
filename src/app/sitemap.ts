import { getTours } from "@/lib/server/content";
import { siteUrl } from "@/lib/site";
import type { MetadataRoute } from "next";

// Tours are edited in /admin; refresh the list hourly like the pages themselves
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = siteUrl();
  const tours = (await getTours()).filter((t) => t.status !== "ended");
  const pages: MetadataRoute.Sitemap = [
    { url: site, changeFrequency: "daily", priority: 1 },
    { url: `${site}/tours`, changeFrequency: "daily", priority: 0.9 },
    { url: `${site}/map`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${site}/resorts`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${site}/news`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${site}/about`, changeFrequency: "monthly", priority: 0.5 },
  ];
  return [
    ...pages,
    ...tours.map((t) => ({
      url: `${site}/tours/${t.id}`,
      changeFrequency: "weekly" as const,
      priority: t.tag === "soon" ? 0.6 : 0.8,
      images: [t.image, ...t.gallery].map((u) => (u.startsWith("/") ? `${site}${u}` : u)).filter((u) => u.startsWith("https://")).slice(0, 5),
    })),
  ];
}
