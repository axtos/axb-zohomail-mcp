# Deploying zoho-mail-mcp (Cloudflare Workers)

This is the one-time setup. After it's done, your team connects from Claude with
a single click — no installs, no config files, no secrets on their machines.

You'll need: a Cloudflare account, Node 18+, and admin access to your Zoho org.

---

## 1. Register a Zoho OAuth app

1. Go to the [Zoho API Console](https://api-console.zoho.com/) → **Add Client** →
   **Server-based Application**.
2. Fill in:
   - **Homepage URL**: anything (e.g. `https://axiomblack.com`)
   - **Authorized Redirect URI**: you'll set the real value after step 3. For now
     use `http://localhost:8787/callback` so you can test locally.
3. Copy the **Client ID** and **Client Secret**.

> **Data center matters.** If your org is on Zoho EU/IN/AU, change `ZOHO_ACCOUNTS_BASE`
> and `ZOHO_API_BASE` in `wrangler.toml` to the matching domain (e.g. `.eu`).

---

## 2. Configure the Worker

```bash
npm install

# Create the KV namespace that stores per-user grants, then paste the printed
# id into wrangler.toml under [[kv_namespaces]] id = "..."
npx wrangler kv namespace create OAUTH_KV

# Store secrets (these are encrypted by Cloudflare and never committed)
npx wrangler secret put ZOHO_CLIENT_ID
npx wrangler secret put ZOHO_CLIENT_SECRET
```

---

## 3. Deploy & wire up the redirect URI

```bash
npm run deploy
```

Wrangler prints your worker URL, e.g. `https://zoho-mail-mcp.<you>.workers.dev`.

1. In **wrangler.toml**, set:
   ```toml
   ZOHO_REDIRECT_URI = "https://zoho-mail-mcp.<you>.workers.dev/callback"
   ```
2. In the **Zoho API Console**, set the **Authorized Redirect URI** to that exact
   same URL.
3. Re-deploy so the new value takes effect:
   ```bash
   npm run deploy
   ```

---

## 4. Add the connector in Claude (Team/Enterprise)

As a Workspace admin (so it rolls out to everyone):

1. **Settings → Connectors → Add custom connector**
2. **Name**: Zoho Mail
3. **URL**: `https://zoho-mail-mcp.<you>.workers.dev/mcp`
4. Save.

Each teammate then opens their connectors, clicks **Connect** next to Zoho Mail,
logs into their own Zoho account, approves access — and Claude can use their
mailbox. That's the entire experience for them.

---

## Verifying it works

- Visit `https://<your-worker>/mcp` directly — you should get an OAuth challenge
  (a JSON error about authorization), not a 500. That means the server is up.
- In Claude, after connecting, ask: *"List my Zoho mail folders."* It should call
  `list_folders` and return your folders.
- Watch live logs while testing: `npx wrangler tail`.

---

## Migrating from the old local version — rotate the secret

The previous `1.x` release committed a Zoho **client secret** to the repo
(`src/config.ts`). Anything committed to git should be treated as compromised:

1. In the [Zoho API Console](https://api-console.zoho.com/), open the old client and
   **regenerate (or delete) its client secret**.
2. Use a **fresh** client for this deployment (the secret you set in step 2).

Rewriting git history won't un-leak it — rotation in Zoho is the real fix.

---

## Managing access later

- **Cut off one user**: delete their grant key from the `OAUTH_KV` namespace
  (`npx wrangler kv key list --binding OAUTH_KV`), or have them revoke the app in
  [Zoho Connected Apps](https://accounts.zoho.com/home#connectedapps).
- **Cut off everyone**: regenerate the Zoho client secret and re-deploy.
- **Update tools/code**: edit `src/`, then `npm run deploy`. Connected users stay
  connected.
