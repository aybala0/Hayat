import { google } from "googleapis";
import type { Expense } from "./types.js";
import { USER_A_NAME, USER_A_EMAIL, USER_B_NAME } from "./config.js";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const RANGE = "Sheet1!A:H";

function makeAuth(accessToken: string, refreshToken: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return client;
}

function rowToExpense(row: string[]): Expense {
  return {
    date: row[0] ?? "",
    description: row[1] ?? "",
    tag: row[2] ?? "",
    amount: parseFloat(row[3]) || 0,
    paidBy: row[4] ?? "",
    aylasShare: parseFloat(row[5]) || 0,
    erdemsShare: parseFloat(row[6]) || 0,
    notes: row[7] ?? "",
  };
}

export async function getExpenses(
  accessToken: string,
  refreshToken: string
): Promise<Expense[]> {
  const auth = makeAuth(accessToken, refreshToken);
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: RANGE,
  });
  const rows = (res.data.values ?? []) as string[][];
  return rows.slice(1).map(rowToExpense); // skip header row
}

export async function appendExpense(
  accessToken: string,
  refreshToken: string,
  expense: Expense
): Promise<void> {
  const auth = makeAuth(accessToken, refreshToken);
  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: RANGE,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          expense.date,
          expense.description,
          expense.tag,
          expense.amount,
          expense.paidBy,
          expense.aylasShare,
          expense.erdemsShare,
          expense.notes,
        ],
      ],
    },
  });
}

export async function computeBalance(
  accessToken: string,
  refreshToken: string,
  userEmail: string
): Promise<number> {
  const expenses = await getExpenses(accessToken, refreshToken);
  const isAybala = userEmail === USER_A_EMAIL;
  const myName = isAybala ? USER_A_NAME : USER_B_NAME;

  let balance = 0;
  for (const e of expenses) {
    const iPaid = e.paidBy === myName;
    const myShare = isAybala ? e.aylasShare : e.erdemsShare;
    const theirShare = isAybala ? e.erdemsShare : e.aylasShare;

    if (iPaid) {
      // I paid → their share is money they owe me (positive)
      balance += theirShare;
    } else {
      // They paid → my share is money I owe them (negative)
      balance -= myShare;
    }
  }
  return balance;
}
