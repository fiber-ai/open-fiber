import type { IncomingMessage, ServerResponse } from "http";

const COOKIE_NAME = "fiber-api-key";

export function getApiKeyFromRequest(req: IncomingMessage): string {
  const envKey = process.env.FIBER_API_KEY;
  if (envKey) return envKey;

  const cookieHeader = req.headers.cookie ?? "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));

  return match ? decodeURIComponent(match.split("=")[1] ?? "") : "";
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
