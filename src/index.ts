#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { isSetup } from './auth.js';

async function main() {
  if (!isSetup()) {
    process.stderr.write(
      '❌ Zoho Mail MCP is not authenticated.\n' +
      'Run: npx zoho-mail-mcp setup\n'
    );
    process.exit(1);
  }

  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err.message}\n`);
  process.exit(1);
});
