import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clearSession } from "../../lib/auth.js";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  clearSession(res);
  res.json({ ok: true });
}
