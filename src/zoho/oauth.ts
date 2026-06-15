import type { Env } from "../types.js";
import { ZOHO_SCOPES } from "../types.js";

export interface ZohoTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
}

export interface ZohoAccount {
  accountId: string;
  emailAddress: string;
  displayName: string;
}

/**
 * Build the Zoho consent URL. We start at the configured accounts server
 * (US by default); with Multi-DC enabled, Zoho redirects back with the user's
 * actual `accounts-server` + `location`, which we use from then on.
 */
export function getZohoAuthUrl(env: Env, state: string): string {
  const u = new URL(`${env.ZOHO_ACCOUNTS_BASE}/oauth/v2/auth`);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", env.ZOHO_CLIENT_ID);
  u.searchParams.set("redirect_uri", env.ZOHO_REDIRECT_URI);
  u.searchParams.set("scope", ZOHO_SCOPES);
  // `offline` + `consent` are required for Zoho to return a refresh token.
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("state", state);
  return u.toString();
}

/**
 * Map a regional accounts server to its Mail API host, e.g.
 * https://accounts.zoho.eu → https://mail.zoho.eu. Works for every Zoho DC
 * because the only difference is the `accounts.` ↔ `mail.` subdomain.
 */
export function mailApiBaseFor(accountsServer: string): string {
  return accountsServer.replace("://accounts.", "://mail.");
}

async function postToken(accountsServer: string, params: Record<string, string>): Promise<ZohoTokens> {
  const res = await fetch(`${accountsServer}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const data = (await res.json()) as Record<string, any>;
  if (!res.ok || data.error) {
    throw new Error(`Zoho token request failed: ${data.error ?? res.status}`);
  }
  return data as ZohoTokens;
}

/** Exchange an authorization code for access + refresh tokens (on the user's DC). */
export function exchangeCodeForZohoTokens(
  env: Env,
  code: string,
  accountsServer: string,
): Promise<ZohoTokens> {
  return postToken(accountsServer, {
    grant_type: "authorization_code",
    client_id: env.ZOHO_CLIENT_ID,
    client_secret: env.ZOHO_CLIENT_SECRET,
    redirect_uri: env.ZOHO_REDIRECT_URI,
    code,
  });
}

/** Mint a fresh access token from a stored refresh token (on the user's DC). */
export async function refreshZohoToken(
  env: Env,
  refreshToken: string,
  accountsServer: string,
): Promise<ZohoTokens> {
  const tokens = await postToken(accountsServer, {
    grant_type: "refresh_token",
    client_id: env.ZOHO_CLIENT_ID,
    client_secret: env.ZOHO_CLIENT_SECRET,
    refresh_token: refreshToken,
  });
  // Zoho omits refresh_token on refresh — carry the original forward.
  return { ...tokens, refresh_token: tokens.refresh_token || refreshToken };
}

/** Look up the user's primary Zoho account, used to identify the session. */
export async function fetchPrimaryAccount(apiBase: string, accessToken: string): Promise<ZohoAccount> {
  const res = await fetch(`${apiBase}/api/accounts`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });
  const data = (await res.json()) as Record<string, any>;
  if (!res.ok) {
    throw new Error(`Could not load Zoho account: ${data?.data?.errorMessage ?? res.status}`);
  }
  const accounts: any[] = data.data ?? [];
  const primary = accounts.find((a) => a.isPrimary) ?? accounts[0];
  if (!primary) throw new Error("No Zoho Mail account found for this user.");
  return {
    accountId: String(primary.accountId),
    emailAddress: primary.emailAddress ?? primary.primaryEmailAddress ?? "unknown",
    displayName: primary.displayName ?? primary.accountName ?? "Zoho User",
  };
}
