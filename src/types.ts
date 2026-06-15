import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";

/**
 * Worker bindings. Secrets (ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET) are injected
 * by Wrangler and merged into this shape.
 */
export interface Env {
  // Set automatically by the OAuthProvider wrapper.
  OAUTH_PROVIDER: OAuthHelpers;
  // KV namespace the OAuthProvider uses to persist grants.
  OAUTH_KV: KVNamespace;
  // Durable Object namespace hosting the MCP agent.
  MCP_OBJECT: DurableObjectNamespace;

  // Zoho OAuth app credentials (secrets).
  ZOHO_CLIENT_ID: string;
  ZOHO_CLIENT_SECRET: string;

  // Regional endpoints + redirect (vars).
  ZOHO_ACCOUNTS_BASE: string;
  ZOHO_API_BASE: string;
  ZOHO_REDIRECT_URI: string;
}

/**
 * Per-user context attached to an authenticated MCP session. Stored encrypted
 * inside the OAuth grant by the provider and surfaced to the agent as
 * `this.props`. The Zoho client secret never appears here.
 */
export interface Props {
  email: string;
  name: string;
  accountId: string;
  zohoAccessToken: string;
  zohoRefreshToken: string;
  /** Unix ms — when the access token above stops being valid. */
  expiresAt: number;
  /** The user's Zoho data-center endpoints, resolved at sign-in (Multi-DC). */
  accountsServer: string;
  apiBase: string;
  [key: string]: unknown;
}

/** Minimum OAuth scopes — message + folder + tag access, read-only on accounts. */
export const ZOHO_SCOPES = [
  "ZohoMail.messages.ALL",
  "ZohoMail.accounts.READ",
  "ZohoMail.folders.ALL",
  "ZohoMail.tags.ALL",
].join(",");
