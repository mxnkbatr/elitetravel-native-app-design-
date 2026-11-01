import { siteUrl } from "@/lib/site";
import type { MetadataRoute } from "next";
import { headers } from "next/headers";

/**
 * Only the real site is indexed. Preview deployments and the other Vercel projects that
 * build from this repo answer "disallow all", so search engines never list duplicates.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = siteUrl();
  const host = (await headers()).get("host");
  if (host && host !== new URL(site).host) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/bookings/", "/profile"] },
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
