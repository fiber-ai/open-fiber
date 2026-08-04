import type { IncomingMessage, ServerResponse } from "http";

const COOKIE_NAME = "fiber-api-key";

export function getApiKeyFromRequest(req: IncomingMessage): string {
  const cookieHeader = req.headers.cookie ?? "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));

  const cookieKey = match ? decodeURIComponent(match.split("=")[1] ?? "") : "";
  if (cookieKey) return cookieKey;

  // Falls back to FIBER_API_KEY only when the visitor hasn't set their own key via
  // /setup — keeps single-tenant self-hosted deployments working without a cookie.
  return process.env.FIBER_API_KEY ?? "";
}

export function setApiKeyCookie(res: ServerResponse, apiKey: string) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(apiKey)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`
  );
}

export function clearApiKeyCookie(res: ServerResponse) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}
