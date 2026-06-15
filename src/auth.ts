import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import { CONFIG } from './config.js';

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix ms
}

function tokenFilePath(): string {
  return path.join(os.homedir(), CONFIG.TOKEN_FILE);
}

export function saveTokens(data: TokenData): void {
  const filePath = tokenFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), { mode: 0o600 });
}

export function loadTokens(): TokenData | null {
  const filePath = tokenFilePath();
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as TokenData;
  } catch {
    return null;
  }
}

export function isSetup(): boolean {
  return loadTokens() !== null;
}

async function refreshAccessToken(refreshToken: string): Promise<TokenData> {
  const res = await axios.post(`${CONFIG.AUTH_BASE}/oauth/v2/token`, null, {
    params: {
      grant_type: 'refresh_token',
      client_id: CONFIG.CLIENT_ID,
      client_secret: CONFIG.CLIENT_SECRET,
      refresh_token: refreshToken,
    },
  });

  if (res.data.error) {
    throw new Error(`Token refresh failed: ${res.data.error}`);
  }

  const tokens: TokenData = {
    accessToken: res.data.access_token,
    refreshToken,
    expiresAt: Date.now() + res.data.expires_in * 1000 - 60_000, // 1 min buffer
  };
  saveTokens(tokens);
  return tokens;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenData> {
  const res = await axios.post(`${CONFIG.AUTH_BASE}/oauth/v2/token`, null, {
    params: {
      grant_type: 'authorization_code',
      client_id: CONFIG.CLIENT_ID,
      client_secret: CONFIG.CLIENT_SECRET,
      redirect_uri: CONFIG.REDIRECT_URI,
      code,
    },
  });

  if (res.data.error) {
    throw new Error(`Token exchange failed: ${res.data.error}`);
  }

  const tokens: TokenData = {
    accessToken: res.data.access_token,
    refreshToken: res.data.refresh_token,
    expiresAt: Date.now() + res.data.expires_in * 1000 - 60_000,
  };
  saveTokens(tokens);
  return tokens;
}

export async function getValidAccessToken(): Promise<string> {
  const tokens = loadTokens();
  if (!tokens) {
    throw new Error(
      'Not authenticated. Run: npx zoho-mail-mcp setup'
    );
  }

  if (Date.now() < tokens.expiresAt) {
    return tokens.accessToken;
  }

  const refreshed = await refreshAccessToken(tokens.refreshToken);
  return refreshed.accessToken;
}
