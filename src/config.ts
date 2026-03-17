export const USER_A_NAME = "Aybala";
export const USER_A_EMAIL = "ibala.esmer@gmail.com";
export const USER_B_NAME = "Erdem";
export const USER_B_EMAIL = "erdemyelmenoglu@gmail.com";

export const TAGS = [
  { label: "Food & Drinks", emoji: "🍔" },
  { label: "Groceries", emoji: "🛒" },
  { label: "Rent & Bills", emoji: "🏠" },
  { label: "Transport", emoji: "🚗" },
  { label: "Fun & Activities", emoji: "🎉" },
  { label: "Health", emoji: "🏥" },
  { label: "Shopping", emoji: "🛍️" },
  { label: "Travel", emoji: "✈️" },
  { label: "Other", emoji: "📦" },
] as const;

export function getOtherName(myEmail: string): string {
  return myEmail === USER_A_EMAIL ? USER_B_NAME : USER_A_NAME;
}

export function isUserA(email: string): boolean {
  return email === USER_A_EMAIL;
}
