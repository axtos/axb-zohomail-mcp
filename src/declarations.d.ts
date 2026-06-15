// Ambient declarations for MCP SDK — only needed if .d.ts files are missing from the installed package.
// On a fresh `npm install` these declarations are unused (the real ones take precedence).
declare module '@modelcontextprotocol/sdk/server/mcp.js' {
  export class McpServer {
    constructor(info: { name: string; version: string });
    tool(name: string, description: string, schema: Record<string, unknown>, cb: (args: any) => Promise<any>): void;
    connect(transport: any): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/server/stdio.js' {
  export class StdioServerTransport {
    constructor();
  }
}
