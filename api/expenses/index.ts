import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSession } from "../../lib/auth.js";
import { getExpenses, appendExpense, deleteExpense } from "../../lib/sheets.js";
import { USER_A_NAME, USER_A_EMAIL, USER_B_NAME } from "../../lib/config.js";
import type { Expense } from "../../lib/types.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await getSession(req);
  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (req.method === "GET") {
    try {
      const expenses = await getExpenses(session.accessToken, session.refreshToken);
      return res.json(expenses);
    } catch (err) {
      console.error("getExpenses error:", err);
      return res.status(500).json({ error: "Failed to load expenses from Google Sheets." });
    }
  }

  if (req.method === "POST") {
    const { description, tag, amount, paidBy, aylasShare, erdemsShare, notes } =
      req.body as Partial<Expense>;

    if (!description || !tag || amount == null || !paidBy || aylasShare == null || erdemsShare == null) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number." });
    }

    if (paidBy !== USER_A_NAME && paidBy !== USER_B_NAME) {
      return res.status(400).json({ error: "Invalid paidBy value." });
    }

    if (aylasShare < 0 || erdemsShare < 0) {
      return res.status(400).json({ error: "Shares cannot be negative." });
    }

    if (Math.abs(aylasShare + erdemsShare - amount) > 0.02) {
      return res.status(400).json({ error: "Shares must add up to the total amount." });
    }

    // Only allow the logged-in user's perspective on who paid
    // (prevents one user from submitting expenses as the other)
    const myName = session.email === USER_A_EMAIL ? USER_A_NAME : USER_B_NAME;
    const otherName = session.email === USER_A_EMAIL ? USER_B_NAME : USER_A_NAME;
    if (paidBy !== myName && paidBy !== otherName) {
      return res.status(400).json({ error: "Invalid paidBy value." });
    }

    const expense: Expense = {
      date: new Date().toISOString().split("T")[0],
      description,
      tag,
      amount,
      paidBy,
      aylasShare,
      erdemsShare,
      notes: notes ?? "",
    };

    try {
      await appendExpense(session.accessToken, session.refreshToken, expense);
      return res.status(201).json(expense);
    } catch (err) {
      console.error("appendExpense error:", err);
      return res.status(500).json({ error: "Failed to save expense to Google Sheets." });
    }
  }

  if (req.method === "DELETE") {
    const rowIndex = parseInt(req.query.rowIndex as string);
    if (isNaN(rowIndex) || rowIndex < 0) {
      return res.status(400).json({ error: "Invalid rowIndex." });
    }
    try {
      await deleteExpense(session.accessToken, session.refreshToken, rowIndex);
      return res.json({ ok: true });
    } catch (err) {
      console.error("deleteExpense error:", err);
      return res.status(500).json({ error: "Failed to delete expense." });
    }
  }

  res.status(405).json({ error: "Method not allowed" });
}
