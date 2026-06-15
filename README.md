# zoho-mail-mcp

Zoho Mail MCP server for Claude. Read, search, draft, and send email via natural language.

Built by [Axiom Black](https://axiomblack.com).

---

## Features

- **Read** emails, threads, and attachments
- **Search** across all folders
- **Draft** emails saved to Zoho Mail for manual review
- **Send** emails with explicit confirmation step
- **Organize** — move, label, archive, flag, mark read/unread

## Setup

### 1. Install & authenticate

```bash
npx zoho-mail-mcp setup
```

This opens your browser for Zoho OAuth login. Approve access, and your tokens are saved automatically to `~/.zoho-mail-mcp/tokens.json`.

### 2. Add to Claude config

Open your Claude desktop config file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add:

```json
{
  "mcpServers": {
    "zoho-mail": {
      "command": "npx",
      "args": ["zoho-mail-mcp"]
    }
  }
}
```

### 3. Restart Claude

That's it — Claude can now access your Zoho Mail.

---

## Tools

| Tool | Description |
|------|-------------|
| `get_accounts` | Get your Zoho account IDs |
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
| `move_email` | Move to folder |
| `apply_label` | Add or remove labels |

---

## Security

- OAuth tokens stored in `~/.zoho-mail-mcp/tokens.json` (permissions: 600)
- Minimum OAuth scopes — no org-admin access
- `send_email` requires explicit user confirmation before firing
- No bulk destructive operations

---

## Revoking access

Go to [Zoho Connected Apps](https://accounts.zoho.com/home#connectedapps) and revoke `zoho-mail-mcp`.

---

## License

MIT © Axiom Black
