export type User = {
  name: string;
  email: string;
};

export type Expense = {
  date: string;
  description: string;
  tag: string;
  amount: number;
  paidBy: string;
  aylasShare: number;
  erdemsShare: number;
  notes: string;
};

export type Balance = {
  amount: number;
  direction: "owe" | "owed" | "square";
  otherName: string;
};

export type SplitOption =
  | "50/50-me"
  | "50/50-them"
  | "full-me"
  | "full-them"
  | "custom";
