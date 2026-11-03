import { redirect } from "next/navigation";

/** The general agent became the site desk; old links and the palette's "ask AI" land there. */
export default async function AdminAgentPage({ searchParams }: PageProps<"/admin/agent">) {
  const { c, ask } = await searchParams;
  const q = new URLSearchParams();
  if (typeof c === "string") q.set("c", c);
  if (typeof ask === "string") q.set("ask", ask);
  redirect(`/admin/agent/site${q.size ? `?${q}` : ""}`);
}
