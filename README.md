# zoho-mail-mcp

A **remote** Zoho Mail MCP server for Claude — read, search, draft, and send email by natural language. Runs on Cloudflare Workers with per-user OAuth, so a whole team can connect with one click and no local setup.

Built by [Axiom Black](https://axiomblack.com).

---

## How it works

You deploy this **once**. Each teammate connects from Claude and signs into **their own** Zoho mailbox in the browser — they never install anything, edit a config file, or handle any secret.

```
Claude (Team/Enterprise)
      │  add custom connector → https://<your-worker>/mcp
      ▼
Cloudflare Worker (this repo)
      │  per-user OAuth, tokens encrypted in KV
      ▼
Zoho Mail API
```

- **One Zoho OAuth app**, registered in your org. Its client secret lives only in Cloudflare secrets — never in the repo, never on a laptop.
- **Per-user tokens** are stored encrypted in Workers KV. Remove a user → access is gone. One central kill-switch.
- **Access tokens refresh transparently** inside the server using each user's refresh token.

> Upgrading from the old local (`npx`) version? That approach shipped a shared
> secret and required per-machine setup. This release replaces it. **Rotate the
> old Zoho client secret** — see [DEPLOY.md](./DEPLOY.md).

---

## Quick start

Full walkthrough in **[DEPLOY.md](./DEPLOY.md)**. In short:

```bash
npm install
npx wrangler kv namespace create OAUTH_KV     # paste id into wrangler.toml
npx wrangler secret put ZOHO_CLIENT_ID
npx wrangler secret put ZOHO_CLIENT_SECRET
npm run deploy
```

Then register your worker's `/callback` URL in the [Zoho API console](https://api-console.zoho.com/), set `ZOHO_REDIRECT_URI` in `wrangler.toml`, and re-deploy.

### Add it in Claude (Team/Enterprise)

A Workspace admin adds it once so it appears for everyone:

1. **Settings → Connectors → Add custom connector**
2. URL: `https://<your-worker-subdomain>.workers.dev/mcp`
3. Save. Teammates click **Connect**, approve Zoho access, and they're done.

---

## Tools

| Tool | Description |
|------|-------------|
| `get_accounts` | List the user's Zoho account IDs |
| `list_folders` | List all folders |
| `list_emails` | List emails in a folder |
| `search_emails` | Search by keyword or sender |
| `get_email` | Read full email content |
| `list_threads` | Get a conversation thread |
| `get_attachment_info` | List attachments on an email |
| `get_attachment` | Get attachment metadata |
| `save_draft` | Save to Drafts folder |
| `send_email` | Send with explicit user confirmation |
| `update_email` | Mark read/unread, flag, archive, spam |
| `move_email` | Move to a folder |
| `apply_label` | Add or remove labels |

Every tool defaults to the signed-in user's primary account, so the model rarely needs an account ID up front.

---

## Security

- **Per-user OAuth** — each person authenticates as themselves; no shared mailbox access.
- **Secret isolation** — the Zoho client secret is a Cloudflare secret, never distributed.
- **Encrypted token storage** — grants live in Workers KV, encrypted at rest.
- **Minimum scopes** — messages, folders, tags, and read-only account info. No org-admin.
- **Send guardrail** — `send_email` is documented to require an explicit preview + confirmation before firing.
- **Central revocation** — drop a grant in KV, or revoke the app in [Zoho Connected Apps](https://accounts.zoho.com/home#connectedapps).

---

## Local development

```bash
cp .dev.vars.example .dev.vars   # fill in your Zoho dev credentials
npm run dev                       # http://localhost:8787
npm run typecheck
```

---

## License

MIT © Axiom Black
