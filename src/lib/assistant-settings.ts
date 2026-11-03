/** What staff can change about the site's AI assistant from /admin/assistant. Shared by server and client. */
export type AssistantSettings = {
  /** Show the chat button on the site at all */
  enabled: boolean;
  /** First bubble the visitor sees */
  greeting: string;
  /** Tap-to-ask chips under the greeting */
  suggestions: string[];
  /** Extra guidance appended to the assistant's rules (promotions, tone, what to push this week) */
  instructions: string;
};

/** The public part the chat widget needs (instructions stay on the server). */
export type AssistantPublic = Pick<AssistantSettings, "greeting" | "suggestions">;

export const ASSISTANT_DEFAULTS: AssistantSettings = {
  enabled: true,
  greeting: "Сайн байна уу! 👋 Аялал, үнэ, огнооны талаар асуугаарай — тохирох аяллыг санал болгоё.",
  suggestions: ["Хамгийн ойрын аялал?", "Бали аяллын үнэ?", "2 хүн Хайнань явахад урьдчилгаа хэд вэ?", "Хайнань аялалд юу багтсан бэ?", "Хуваан төлөх боломжтой юу?"],
  instructions: "",
};

export const ASSISTANT_LIMITS = { greeting: 300, suggestion: 80, suggestions: 6, instructions: 3000 } as const;

/** Rebuilds settings from untrusted input, falling back to the defaults field by field. */
export function cleanAssistantSettings(input: unknown): AssistantSettings {
  const v = (input ?? {}) as Partial<Record<keyof AssistantSettings, unknown>>;
  const text = (x: unknown, max: number) => (typeof x === "string" ? x.trim().slice(0, max) : "");
  const suggestions = Array.isArray(v.suggestions)
    ? v.suggestions.map((s) => text(s, ASSISTANT_LIMITS.suggestion)).filter(Boolean).slice(0, ASSISTANT_LIMITS.suggestions)
    : ASSISTANT_DEFAULTS.suggestions;
  return {
    enabled: typeof v.enabled === "boolean" ? v.enabled : ASSISTANT_DEFAULTS.enabled,
    greeting: text(v.greeting, ASSISTANT_LIMITS.greeting) || ASSISTANT_DEFAULTS.greeting,
    suggestions,
    instructions: text(v.instructions, ASSISTANT_LIMITS.instructions),
  };
}
