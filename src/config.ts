export const CONFIG = {
  CLIENT_ID: '1000.JA4Q7WY2ZRWZJNZX87GOTJB9M5HSSJ',
  CLIENT_SECRET: '5495b67641b9e39713cff1ae61e86b984c1f42fb1b',
  REDIRECT_URI: 'http://localhost:3000/callback',
  SCOPES: [
    'ZohoMail.messages.ALL',
    'ZohoMail.accounts.READ',
    'ZohoMail.folders.ALL',
    'ZohoMail.tags.ALL',
  ].join(','),
  AUTH_BASE: 'https://accounts.zoho.com',
  API_BASE: 'https://mail.zoho.com',
  TOKEN_FILE: '.zoho-mail-mcp/tokens.json',
} as const;
