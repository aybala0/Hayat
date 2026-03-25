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

  // Insert a blank row at position 1 (0-indexed) = row 2 in sheet, below header
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId: 0, // gid of Sheet1 (first sheet)
              dimension: "ROWS",
              startIndex: 1,
              endIndex: 2,
            },
            inheritFromBefore: false,
          },
        },
      ],
    },
  });

  // Write data into the newly created row 2
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: "Sheet1!A2:H2",
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

export async function updateExpense(
  accessToken: string,
  refreshToken: string,
  dataRowIndex: number,
  expense: Expense
): Promise<void> {
  const auth = makeAuth(accessToken, refreshToken);
  const sheets = google.sheets({ version: "v4", auth });
  const sheetRow = dataRowIndex + 2; // +1 skip header, +1 for 1-indexed
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Sheet1!A${sheetRow}:H${sheetRow}`,
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

export async function deleteExpense(
  accessToken: string,
  refreshToken: string,
  dataRowIndex: number // 0-based index in the data rows (0 = first row after header)
): Promise<void> {
  const auth = makeAuth(accessToken, refreshToken);
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: 0,
              dimension: "ROWS",
              startIndex: dataRowIndex + 1, // +1 to skip header row
              endIndex: dataRowIndex + 2,
            },
          },
        },
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
