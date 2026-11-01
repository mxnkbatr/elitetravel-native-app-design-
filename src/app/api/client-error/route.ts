import { clientIp, rateLimit } from "@/lib/server/chat-security";
import { logError } from "@/lib/server/error-log";

export const runtime = "nodejs";

/** Receives browser error reports from instrumentation-client.ts. */
export async function POST(request: Request) {
  if (!rateLimit(`client-error:${clientIp(request)}`, 10)) return new Response(null, { status: 204 });
  let body: { message?: unknown; stack?: unknown; path?: unknown; ua?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const str = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : undefined);
  const message = str(body.message, 1000);
  if (!message) return new Response(null, { status: 400 });
  await logError({ source: "client", message, path: str(body.path, 300), context: { stack: str(body.stack, 1500), ua: str(body.ua, 200) } });
  return new Response(null, { status: 204 });
}
