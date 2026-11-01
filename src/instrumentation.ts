import type { Instrumentation } from "next";

/** Server errors (pages, route handlers, server actions, proxy) go to error_log, shown in /admin/errors. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logError } = await import("@/lib/server/error-log");
  const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  const digest = typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : undefined;
  await logError({
    source: "server",
    message,
    digest,
    path: request.path,
    context: {
      method: request.method,
      route: context.routePath,
      type: context.routeType,
      stack: err instanceof Error ? err.stack?.split("\n").slice(0, 6).join("\n") : undefined,
    },
  });
};
