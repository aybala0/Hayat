import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSession, clearSession, isInvalidGrant } from "../lib/auth.js";
import { computeBalance } from "../lib/sheets.js";
import { getOtherUser } from "../lib/config.js";
import type { Balance } from "../lib/types.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await getSession(req);
  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const raw = await computeBalance(
      session.accessToken,
      session.refreshToken,
      session.email
    );

    const otherUser = getOtherUser(session.email)!;

    let direction: Balance["direction"];
    if (raw > 0.005) direction = "owed";       // they owe me
    else if (raw < -0.005) direction = "owe";  // I owe them
    else direction = "square";

    const balance: Balance = {
      amount: Math.abs(raw),
      direction,
      otherName: otherUser.name,
    };

    res.json(balance);
  } catch (err) {
    console.error("computeBalance error:", err);
    if (isInvalidGrant(err)) {
      clearSession(res);
      return res.status(401).json({ error: "Session expired. Please sign in again." });
    }
    res.status(500).json({ error: "Failed to compute balance." });
  }
}
