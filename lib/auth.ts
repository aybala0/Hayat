import { SignJWT, jwtVerify } from "jose";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { JWTPayload } from "./types.js";

const COOKIE_NAME = "hayat_session";
const MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

function parseCookie(cookieHeader: string, name: string): string | null {
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k.trim() === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export async function getSession(req: VercelRequest): Promise<JWTPayload | null> {
  const cookieHeader = req.headers.cookie ?? "";
  const token = parseCookie(cookieHeader, COOKIE_NAME);
  if (!token) return null;
  return verifyToken(token);
}

export async function setSession(
  res: VercelResponse,
  payload: JWTPayload
): Promise<void> {
  const token = await signToken(payload);
  const isProd = process.env.NODE_ENV === "production";
  const secure = isProd ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${secure}`
  );
}

export function clearSession(res: VercelResponse): void {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
  );
}
