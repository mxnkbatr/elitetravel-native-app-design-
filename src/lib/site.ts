/** The public address of the site (SITE_URL), used for canonical links, the sitemap and structured data. */
export function siteUrl() {
  return (process.env.SITE_URL || "https://elitetravel.mn").replace(/\/+$/, "");
}

/** JSON-LD for a <script type="application/ld+json">, safe to inline in HTML. */
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
