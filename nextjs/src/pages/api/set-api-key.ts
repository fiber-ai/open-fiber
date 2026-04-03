import type { NextApiRequest, NextApiResponse } from "next";
import { setApiKeyCookie, clearApiKeyCookie } from "@/lib/api-key";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { apiKey } = req.body as { apiKey?: string };

  if (!apiKey) {
    clearApiKeyCookie(res);
    return res.status(200).json({ ok: true, cleared: true });
  }

  setApiKeyCookie(res, apiKey);
  return res.status(200).json({ ok: true });
}
