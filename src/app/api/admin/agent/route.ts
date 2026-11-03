import { can } from "@/lib/permissions";
import { agentTools } from "@/lib/server/agent/tools";
import { openConversation, saveConversation } from "@/lib/server/agent/conversations";
import { agentSystemPrompt } from "@/lib/server/agent/prompt";
import { chatModel } from "@/lib/server/ai";
import { getAdmin } from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/chat-security";
import { convertToModelMessages, createIdGenerator, isStepCount, streamText, type UIMessage } from "ai";

export const runtime = "nodejs";
export const maxDuration = 120;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Turns sent to the model; the whole chat stays saved. */
const CONTEXT_MESSAGES = 30;

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

/**
 * Admin AI agent: { id, message } → streamed reply. Only the new user message comes from the
 * browser; the history is loaded from the database, so earlier turns and tool results cannot
 * be forged. Every request re-checks the staff session and role.
 */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return fail(401, "Дахин нэвтэрнэ үү.");
  if (!can(admin.role, "agent.use")) return fail(403, "Танд AI туслах ашиглах эрх алга.");
  if (!rateLimit(`agent:${admin.email}`, 20)) return fail(429, "Хэт олон хүсэлт. Нэг минут хүлээгээд дахин оролдоно уу.");
  const model = chatModel();
  if (!model) return fail(503, "AI тохируулаагүй байна (XAI_API_KEY).");

  let body: { id?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "Хүсэлт буруу байна.");
  }
  const id = typeof body.id === "string" && UUID.test(body.id) ? body.id : null;
  const message = body.message as UIMessage | undefined;
  const text =
    message?.role === "user" && Array.isArray(message.parts)
      ? message.parts
          .filter((p): p is { type: "text"; text: string } => p?.type === "text" && typeof (p as { text?: unknown }).text === "string")
          .map((p) => p.text)
          .join("\n")
          .trim()
      : "";
  if (!id || !text) return fail(400, "Хүсэлт буруу байна.");
  if (text.length > 4000) return fail(413, "Мессеж хэт урт байна (4000 тэмдэгт хүртэл).");

  const conversation = await openConversation(id, admin.email, text);
  if (!conversation) return fail(404, "Яриа олдсонгүй.");

  const userMessage: UIMessage = { id: typeof message?.id === "string" ? message.id.slice(0, 64) : crypto.randomUUID(), role: "user", parts: [{ type: "text", text }] };
  const messages = [...conversation.messages, userMessage];
  const tools = agentTools({ admin, conversationId: id });

  const result = streamText({
    model,
    providerOptions: { xai: { reasoningEffort: "medium" } },
    system: agentSystemPrompt(admin, Object.keys(tools)),
    messages: await convertToModelMessages(messages.slice(-CONTEXT_MESSAGES), { tools, ignoreIncompleteToolCalls: true }),
    tools,
    stopWhen: isStepCount(8),
    maxOutputTokens: 4000,
    onError: ({ error }) => console.error("[agent]", error instanceof Error ? error.message : error),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
    onEnd: ({ messages: all }) => saveConversation(id, admin.email, all),
    onError: () => "AI туслах түр ажиллахгүй байна. Дахин оролдоно уу.",
  });
}
