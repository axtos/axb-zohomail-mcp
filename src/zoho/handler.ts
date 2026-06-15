import { Hono } from "hono";
import type { AuthRequest, OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import type { Env, Props } from "../types.js";
import {
  exchangeCodeForZohoTokens,
  fetchPrimaryAccount,
  getZohoAuthUrl,
  mailApiBaseFor,
} from "./oauth.js";

/**
 * Front-channel OAuth handler. The OAuthProvider makes this Worker an OAuth
 * server *to Claude*; here we broker the upstream login *to Zoho* so each user
 * authenticates with their own mailbox. The Zoho client secret lives only in
 * Worker secrets and never reaches the client.
 */
const app = new Hono<{ Bindings: Env }>();

// Step 1: Claude sends the user here to start authorization.
app.get("/authorize", async (c) => {
  const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
  if (!oauthReqInfo.clientId) {
    return c.text("Invalid authorization request", 400);
  }
  // Encode the MCP auth request in `state` so we can finish after Zoho returns.
  const state = btoa(JSON.stringify(oauthReqInfo));
  return Response.redirect(getZohoAuthUrl(c.env, state), 302);
});

// Step 2: Zoho redirects back here with an authorization code.
app.get("/callback", async (c) => {
  const error = c.req.query("error");
  if (error) return c.text(`Zoho authorization failed: ${error}`, 400);

  const code = c.req.query("code");
  const stateParam = c.req.query("state");
  if (!code || !stateParam) return c.text("Missing code or state", 400);

  let oauthReqInfo: AuthRequest;
  try {
    oauthReqInfo = JSON.parse(atob(stateParam)) as AuthRequest;
  } catch {
    return c.text("Invalid state", 400);
  }

  // With Multi-DC, Zoho tells us which data center this user belongs to.
  // Fall back to the configured defaults when those params aren't present.
  const accountsServer = c.req.query("accounts-server") ?? c.env.ZOHO_ACCOUNTS_BASE;
  const apiBase = c.req.query("accounts-server")
    ? mailApiBaseFor(accountsServer)
    : c.env.ZOHO_API_BASE;

  const tokens = await exchangeCodeForZohoTokens(c.env, code, accountsServer);
  const account = await fetchPrimaryAccount(apiBase, tokens.access_token);

  const props: Props = {
    email: account.emailAddress,
    name: account.displayName,
    accountId: account.accountId,
    zohoAccessToken: tokens.access_token,
    zohoRefreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000 - 60_000,
    accountsServer,
    apiBase,
  };

  // Hand control back to the OAuth provider, which issues Claude its own token
  // and persists `props` (encrypted) in OAUTH_KV.
  const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
    request: oauthReqInfo,
    userId: account.emailAddress,
    metadata: { label: account.displayName },
    scope: oauthReqInfo.scope,
    props,
  });

  return Response.redirect(redirectTo, 302);
});

export { app as ZohoHandler };
