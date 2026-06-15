import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Env, Props } from "./types.js";
import { ZohoClient } from "./zoho/client.js";
import { refreshZohoToken } from "./zoho/oauth.js";
import { registerTools } from "./tools.js";

/**
 * One Durable Object instance per authenticated MCP session. The user's Zoho
 * tokens arrive via `this.props` (decrypted from the OAuth grant); we keep a
 * short-lived access token in memory and refresh it from the refresh token as
 * needed, so the Zoho secret stays server-side and tokens never leave here.
 */
export class ZohoMailMCP extends McpAgent<Env, unknown, Props> {
  server = new McpServer({ name: "zoho-mail-mcp", version: "2.0.0" });

  private cached?: { token: string; expiresAt: number };

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cached && now < this.cached.expiresAt) return this.cached.token;

    // Use the token captured at sign-in until it's close to expiring.
    if (!this.cached && now < this.props.expiresAt) {
      this.cached = { token: this.props.zohoAccessToken, expiresAt: this.props.expiresAt };
      return this.cached.token;
    }

    const refreshed = await refreshZohoToken(this.env, this.props.zohoRefreshToken);
    this.cached = {
      token: refreshed.access_token,
      expiresAt: now + refreshed.expires_in * 1000 - 60_000, // 1 min safety buffer
    };
    return this.cached.token;
  }

  async init(): Promise<void> {
    const client = new ZohoClient(
      () => this.getAccessToken(),
      this.env.ZOHO_API_BASE,
    );
    registerTools(this.server, client, this.props.accountId);
  }
}
