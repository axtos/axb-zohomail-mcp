import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getAccounts } from './tools/accounts.js';
import { listFolders } from './tools/folders.js';
import {
  listEmails,
  searchEmails,
  getEmail,
  listThreads,
  saveDraft,
  sendEmail,
} from './tools/emails.js';
import { getAttachment, getAttachmentInfo } from './tools/attachments.js';
import { updateEmail, moveEmail, applyLabel } from './tools/organize.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'zoho-mail-mcp',
    version: '1.0.0',
  });

  // ── Accounts ──────────────────────────────────────────────────────────────

  server.tool(
    'get_accounts',
    'Get all Zoho Mail accounts for the authenticated user. Always call this first to get accountId values needed for other tools.',
    {},
    async () => {
      const accounts = await getAccounts();
      return { content: [{ type: 'text', text: JSON.stringify(accounts, null, 2) }] };
    }
  );

  // ── Folders ───────────────────────────────────────────────────────────────

  server.tool(
    'list_folders',
    'List all mail folders (Inbox, Sent, Drafts, Trash, custom folders) for an account. Use this to get folderId values.',
    { accountId: z.string().describe('Account ID from get_accounts') },
    async (args) => {
      const folders = await listFolders(args.accountId);
      return { content: [{ type: 'text', text: JSON.stringify(folders, null, 2) }] };
    }
  );

  // ── Emails ────────────────────────────────────────────────────────────────

  server.tool(
    'list_emails',
    'List emails in a folder with pagination. Returns subject, sender, date, read status.',
    {
      accountId: z.string().describe('Account ID from get_accounts'),
      folderId: z.string().optional().describe('Folder ID from list_folders. Omit for inbox.'),
      limit: z.number().min(1).max(100).default(20).describe('Number of emails to return (max 100)'),
      start: z.number().min(0).default(0).describe('Offset for pagination'),
    },
    async (args) => {
      const emails = await listEmails(args.accountId, args.folderId, args.limit, args.start);
      return { content: [{ type: 'text', text: JSON.stringify(emails, null, 2) }] };
    }
  );

  server.tool(
    'search_emails',
    'Search emails by keyword, sender, subject, or any text. Returns matching messages across all folders.',
    {
      accountId: z.string().describe('Account ID from get_accounts'),
      query: z.string().describe('Search query — keyword, email address, or phrase'),
      limit: z.number().min(1).max(50).default(20).describe('Max results to return'),
    },
    async (args) => {
      const results = await searchEmails(args.accountId, args.query, args.limit);
      return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
    }
  );

  server.tool(
    'get_email',
    'Get the full content of a specific email including body, headers, and metadata.',
    {
      accountId: z.string().describe('Account ID from get_accounts'),
      folderId: z.string().describe('Folder ID where the email lives'),
      messageId: z.string().describe('Message ID from list_emails or search_emails'),
    },
    async (args) => {
      const email = await getEmail(args.accountId, args.folderId, args.messageId);
      return { content: [{ type: 'text', text: JSON.stringify(email, null, 2) }] };
    }
  );

  server.tool(
    'list_threads',
    'Get all messages in an email thread/conversation.',
    {
      accountId: z.string().describe('Account ID from get_accounts'),
      threadId: z.string().describe('Thread ID (same as the first message ID in the thread)'),
    },
    async (args) => {
      const thread = await listThreads(args.accountId, args.threadId);
      return { content: [{ type: 'text', text: JSON.stringify(thread, null, 2) }] };
    }
  );

  // ── Attachments ───────────────────────────────────────────────────────────

  server.tool(
    'get_attachment_info',
    'List attachments on an email — returns file names, sizes, and IDs.',
    {
      accountId: z.string(),
      folderId: z.string(),
      messageId: z.string(),
    },
    async (args) => {
      const info = await getAttachmentInfo(args.accountId, args.folderId, args.messageId);
      return { content: [{ type: 'text', text: JSON.stringify(info, null, 2) }] };
    }
  );

  server.tool(
    'get_attachment',
    'Get metadata for a specific attachment. Note: file contents must be downloaded directly from Zoho Mail.',
    {
      accountId: z.string(),
      folderId: z.string(),
      messageId: z.string(),
      attachmentId: z.string().describe('Attachment ID from get_attachment_info'),
    },
    async (args) => {
      const result = await getAttachment(args.accountId, args.folderId, args.messageId, args.attachmentId);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── Drafts & Send ─────────────────────────────────────────────────────────

  server.tool(
    'save_draft',
    'Save an email as a draft in Zoho Mail. Use this when the user wants to review before sending.',
    {
      accountId: z.string().describe('Account ID from get_accounts'),
      toAddress: z.string().describe('Recipient email address'),
      subject: z.string().describe('Email subject'),
      content: z.string().describe('Email body (HTML supported)'),
      ccAddress: z.string().optional().describe('CC email address'),
      replyToMessageId: z.string().optional().describe('Message ID if this is a reply'),
    },
    async (args) => {
      const result = await saveDraft(args.accountId, {
        toAddress: args.toAddress,
        subject: args.subject,
        content: args.content,
        ccAddress: args.ccAddress,
        replyToMessageId: args.replyToMessageId,
      });
      return {
        content: [{
          type: 'text',
          text: `✅ Draft saved!\n\nTo: ${args.toAddress}\nSubject: ${args.subject}\nMessage ID: ${result.messageId}\n\nOpen Zoho Mail to review and send.`,
        }],
      };
    }
  );

  server.tool(
    'send_email',
    `Send an email or reply via Zoho Mail.

⚠️  IMPORTANT — ALWAYS follow this sequence before calling this tool:
1. Show the user a full preview: To, CC (if any), Subject, and the full email body.
2. Ask explicitly: "Confirm sending?"
3. Only call this tool after the user responds with confirmation (e.g. "yes", "send it", "go ahead").
Never send without explicit user approval in the same conversation turn.`,
    {
      accountId: z.string().describe('Account ID from get_accounts'),
      toAddress: z.string().describe('Recipient email address'),
      subject: z.string().describe('Email subject'),
      content: z.string().describe('Email body (HTML supported)'),
      ccAddress: z.string().optional().describe('CC email address'),
      replyToMessageId: z.string().optional().describe('Message ID to reply to (for threading)'),
    },
    async (args) => {
      const result = await sendEmail(args.accountId, {
        toAddress: args.toAddress,
        subject: args.subject,
        content: args.content,
        ccAddress: args.ccAddress,
        replyToMessageId: args.replyToMessageId,
      });
      return {
        content: [{
          type: 'text',
          text: `✅ Email sent!\n\nTo: ${result.toAddress}\nSubject: ${result.subject}\nMessage ID: ${result.messageId}`,
        }],
      };
    }
  );

  // ── Organize ──────────────────────────────────────────────────────────────

  server.tool(
    'update_email',
    'Update email status — mark read/unread, flag, archive, or mark as spam.',
    {
      accountId: z.string(),
      messageId: z.string(),
      action: z.enum([
        'markAsRead',
        'markAsUnread',
        'flag',
        'unflag',
        'archive',
        'unarchive',
        'markAsSpam',
        'markAsNotSpam',
      ]).describe('Action to perform on the email'),
    },
    async (args) => {
      const result = await updateEmail(args.accountId, args.messageId, args.action);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'move_email',
    'Move an email to a different folder.',
    {
      accountId: z.string(),
      messageId: z.string(),
      destinationFolderId: z.string().describe('Target folder ID from list_folders'),
    },
    async (args) => {
      const result = await moveEmail(args.accountId, args.messageId, args.destinationFolderId);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'apply_label',
    'Apply or remove a label/tag on an email.',
    {
      accountId: z.string(),
      messageId: z.string(),
      labelId: z.string().describe('Label ID to apply or remove'),
      remove: z.boolean().default(false).describe('Set true to remove the label instead of adding it'),
    },
    async (args) => {
      const result = await applyLabel(args.accountId, args.messageId, args.labelId, args.remove);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  return server;
}
}
