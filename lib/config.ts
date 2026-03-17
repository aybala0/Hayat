export const USER_A_NAME = "Aybala";
export const USER_A_EMAIL = "ibala.esmer@gmail.com";
export const USER_B_NAME = "Erdem";
export const USER_B_EMAIL = "erdemyelmenoglu@gmail.com";

export function getUserByEmail(
  email: string
): { name: string; email: string } | null {
  if (email === USER_A_EMAIL) return { name: USER_A_NAME, email: USER_A_EMAIL };
  if (email === USER_B_EMAIL) return { name: USER_B_NAME, email: USER_B_EMAIL };
  return null;
}

export function getOtherUser(
  email: string
): { name: string; email: string } | null {
  if (email === USER_A_EMAIL) return { name: USER_B_NAME, email: USER_B_EMAIL };
  if (email === USER_B_EMAIL) return { name: USER_A_NAME, email: USER_A_EMAIL };
  return null;
}
