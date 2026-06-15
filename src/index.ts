import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { ZohoMailMCP } from "./mcp.js";
import { ZohoHandler } from "./zoho/handler.js";

/**
 * Entry point. The OAuthProvider wraps everything: it serves the MCP endpoints
 * (protected by per-user OAuth) and delegates the login UI to ZohoHandler.
 *
 *   /mcp   — Streamable HTTP transport (use this in Claude connectors)
 *   /sse   — legacy SSE transport (for older clients)
 */
export default new OAuthProvider({
  apiHandlers: {
    "/mcp": ZohoMailMCP.serve("/mcp"),
    "/sse": ZohoMailMCP.serveSSE("/sse"),
  },
  defaultHandler: ZohoHandler as any,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});

export { ZohoMailMCP };
