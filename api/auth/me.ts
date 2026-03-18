import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSession } from "../../lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await getSession(req);
  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json({ name: session.name, email: session.email });
}
