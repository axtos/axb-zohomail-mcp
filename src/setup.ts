#!/usr/bin/env node
import http from 'http';
import { URL } from 'url';
import { CONFIG } from './config.js';
import { exchangeCodeForTokens } from './auth.js';

async function openBrowser(url: string) {
  const { default: open } = await import('open');
  await open(url);
}

async function waitForCallback(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const reqUrl = new URL(req.url!, `http://localhost:3000`);
        const code = reqUrl.searchParams.get('code');
        const error = reqUrl.searchParams.get('error');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h2>❌ Authorization failed.</h2><p>You can close this tab.</p>');
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }

        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h2>✅ Authenticated!</h2><p>You can close this tab and return to your terminal.</p>');
          server.close();
          resolve(code);
        }
      } catch (e) {
        reject(e);
      }
    });

    server.listen(3000, '127.0.0.1', () => {
      console.log('⏳ Waiting for Zoho authorization...');
    });

    server.on('error', reject);

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Timed out waiting for authorization. Please try again.'));
    }, 5 * 60 * 1000);
  });
}

async function main() {
  console.log('\n🚀 Zoho Mail MCP — Setup\n');

  const authUrl = new URL(`${CONFIG.AUTH_BASE}/oauth/v2/auth`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', CONFIG.CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', CONFIG.REDIRECT_URI);
  authUrl.searchParams.set('scope', CONFIG.SCOPES);
  authUrl.searchParams.set('access_type', 'offline');

  console.log('Opening your browser for Zoho authorization...');
  console.log('If the browser does not open, visit this URL:\n');
  console.log(authUrl.toString(), '\n');

  try {
    await openBrowser(authUrl.toString());
  } catch {
    // Browser open failed — user can copy the URL manually
  }

  const code = await waitForCallback();

  console.log('\n🔑 Exchanging code for tokens...');
  await exchangeCodeForTokens(code);

  console.log('\n✅ Setup complete! Tokens saved.\n');
  console.log('Add this to your Claude config (claude_desktop_config.json):\n');
  console.log(JSON.stringify({
    mcpServers: {
      'zoho-mail': {
        command: 'npx',
        args: ['zoho-mail-mcp'],
      },
    },
  }, null, 2));
  console.log('\nThen restart Claude and you\'re good to go. 🎉\n');
}

main().catch((err) => {
  console.error(`\n❌ Setup failed: ${err.message}\n`);
  process.exit(1);
});
