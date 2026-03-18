import type { VercelRequest, VercelResponse } from "@vercel/node";
import { google } from "googleapis";
import { getUserByEmail } from "../../lib/config.js";
import { setSession } from "../../lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = req.query.code as string | undefined;
  if (!code) {
    return res.status(400).send("Missing authorization code.");
  }

  const appUrl = process.env.APP_URL!.replace(/\/$/, "");
  const redirectUri = `${appUrl}/api/auth/callback`;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    const { access_token, refresh_token } = tokens;

    if (!access_token || !refresh_token) {
      return res.status(400).send("Google did not return the required tokens. Try signing in again.");
    }

    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    if (!data.email) {
      return res.status(400).send("Could not retrieve your email from Google.");
    }

    const user = getUserByEmail(data.email);
    if (!user) {
      return res.status(403).send("Access denied. This app is private.");
    }

    await setSession(res, {
      name: user.name,
      email: user.email,
      accessToken: access_token,
      refreshToken: refresh_token,
    });

    res.redirect(302, "/");
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.status(500).send("Authentication failed. Please try again.");
  }
}
