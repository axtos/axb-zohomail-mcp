import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ZohoClient } from "./zoho/client.js";

const json = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

/**
 * Register all Zoho Mail tools on an MCP server. `defaultAccountId` is the
 * authenticated user's primary account, so tools can default to it and the
 * model rarely needs to call `get_accounts` first.
 */
export function registerTools(
  server: McpServer,
  client: ZohoClient,
  defaultAccountId: string,
): void {
  const acct = z
    .string()
    .default(defaultAccountId)
    .describe("Zoho account ID. Defaults to the signed-in user's primary account.");

  // ── Accounts ──────────────────────────────────────────────────────────────
  server.tool(
    "get_accounts",
    "List the Zoho Mail accounts the signed-in user can access, with their account IDs.",
    {},
    async () => {
      const res = await client.get<any>("/api/accounts");
      const accounts = (res.data ?? []).map((a: any) => ({
        accountId: a.accountId,
        emailAddress: a.emailAddress ?? a.primaryEmailAddress,
        displayName: a.displayName ?? a.accountName,
        isPrimary: a.isPrimary,
      }));
      return json(accounts);
    },
  );

  // ── Folders ──
  server.tool(
    "list_folders",
    "List all mail folders (Inbox, Sent, Drafts, Trash, custom) for an account. Use to get folderId values.",
    { accountId: acct },
    async ({ accountId }) => {
      const res = await client.get<any>(`/api/accounts/${accountId}/folders`);
      const folders = (res.data ?? []).map((f: any) => ({
        folderId: f.folderId,
        folderName: f.folderName,
        path: f.path,
        unreadCount: f.unreadCount,
        messageCount: f.messageCount,
      }));
      return json(folders);
    },
  );

  // ── Emails ──
  server.tool(
    "list_emails",
    "List emails in a folder with pagination. Returns subject, sender, date, read status.",
    {
      accountId: acct,
      folderId: z.string().optional().describe("Folder ID from list_folders. Omit for inbox."),
      limit: z.number().min(1).max(100).default(20).describe("Number of emails (max 100)"),
      start: z.number().min(0).default(0).describe("Offset for pagination"),
    },
    async ({ accountId, folderId, limit, start }) => {
      const res = await client.get<any>(`/api/accounts/${accountId}/messages/view`, {
        limit,
        start,
        folderId,
      });
      const messages = (res.data ?? []).map((m: any) => ({
        messageId: m.messageId,
        subject: m.subject,
        fromAddress: m.fromAddress,
        toAddress: m.toAddress,
        receivedTime: m.receivedTime,
        isRead: m.isRead,
        hasAttachment: m.hasAttachment,
        folderId: m.folderId,
        summary: m.summary,
      }));
      return json(messages);
    },
  );

  server.tool(
    "search_emails",
    "Search emails by keyword, sender, subject, or any text. Returns matching messages across folders.",
    {
      accountId: acct,
      query: z.string().describe("Search query — keyword, email address, or phrase"),
      limit: z.number().min(1).max(50).default(20).describe("Max results to return"),
    },
    async ({ accountId, query, limit }) => {
      const res = await client.get<any>(`/api/accounts/${accountId}/messages/search`, {
        searchKey: query,
        limit,
      });
      const messages = (res.data ?? []).map((m: any) => ({
        messageId: m.messageId,
        subject: m.subject,
        fromAddress: m.fromAddress,
        toAddress: m.toAddress,
        receivedTime: m.receivedTime,
        isRead: m.isRead,
        folderId: m.folderId,
        summary: m.summary,
      }));
      return json(messages);
    },
  );

  server.tool(
    "get_email",
    "Get the full content of a specific email including body, headers, and metadata.",
    {
      accountId: acct,
      folderId: z.string().describe("Folder ID where the email lives"),
      messageId: z.string().describe("Message ID from list_emails or search_emails"),
    },
    async ({ accountId, folderId, messageId }) => {
      const [content, details] = await Promise.all([
        client.get<any>(`/api/accounts/${accountId}/folders/${folderId}/messages/${messageId}/content`),
        client.get<any>(`/api/accounts/${accountId}/folders/${folderId}/messages/${messageId}/details`),
      ]);
      return json({
        messageId,
        subject: details.data?.subject,
        fromAddress: details.data?.fromAddress,
        toAddress: details.data?.toAddress,
        ccAddress: details.data?.ccAddress,
        receivedTime: details.data?.receivedTime,
        content: content.data?.content,
        isRead: details.data?.isRead,
        hasAttachment: details.data?.hasAttachment,
      });
    },
  );

  server.tool(
    "list_threads",
    "Get all messages in an email thread/conversation.",
    {
      accountId: acct,
      threadId: z.string().describe("Thread ID (same as the first message ID in the thread)"),
    },
    async ({ accountId, threadId }) => {
      const res = await client.get<any>(`/api/accounts/${accountId}/messages/${threadId}/thread`);
      const messages = (res.data ?? []).map((m: any) => ({
        messageId: m.messageId,
        subject: m.subject,
        fromAddress: m.fromAddress,
        receivedTime: m.receivedTime,
        summary: m.summary,
      }));
      return json(messages);
    },
  );

  // ── Attachments ──
  server.tool(
    "get_attachment_info",
    "List attachments on an email — returns file names, sizes, and IDs.",
    {
      accountId: acct,
      folderId: z.string(),
      messageId: z.string(),
    },
    async ({ accountId, folderId, messageId }) => {
      const res = await client.get<any>(
        `/api/accounts/${accountId}/folders/${folderId}/messages/${messageId}/attachmentinfo`,
      );
      return json(res.data ?? []);
    },
  );

  server.tool(
    "get_attachment",
    "Get metadata for a specific attachment (file name, size, type). File bytes are not returned.",
    {
      accountId: acct,
      folderId: z.string(),
      messageId: z.string(),
      attachmentId: z.string().describe("Attachment ID from get_attachment_info"),
    },
    async ({ accountId, folderId, messageId, attachmentId }) => {
      const res = await client.get<any>(
        `/api/accounts/${accountId}/folders/${folderId}/messages/${messageId}/attachmentinfo`,
      );
      const info: any[] = res.data ?? [];
      const match = info.find((a) => String(a.attachmentId) === attachmentId);
      return json({
        attachmentId,
        fileName: match?.fileName ?? "unknown",
        fileSize: match?.size ?? 0,
        mimeType: match?.mimeType ?? "application/octet-stream",
        note: "Attachment identified. Download directly from Zoho Mail to access file contents.",
      });
    },
  );

  // ── Drafts & Send ─────────────────────────────────────────────────────────
  const composeShape = {
    accountId: acct,
    toAddress: z.string().describe("Recipient email address"),
    subject: z.string().describe("Email subject"),
    content: z.string().describe("Email body (HTML supported)"),
    ccAddress: z.string().optional().describe("CC email address"),
    replyToMessageId: z.string().optional().describe("Message ID if this is a reply (for threading)"),
  };

  const buildPayload = (a: any, draft: boolean) => {
    const payload: Record<string, unknown> = {
      toAddress: a.toAddress,
      subject: a.subject,
      content: a.content,
      mailFormat: "html",
    };
    if (draft) payload.action = "draft";
    if (a.ccAddress) payload.ccAddress = a.ccAddress;
    if (a.replyToMessageId) payload.inReplyTo = a.replyToMessageId;
    return payload;
  };

  server.tool(
    "save_draft",
    "Save an email as a draft in Zoho Mail. Use when the user wants to review before sending.",
    composeShape,
    async (a) => {
      const res = await client.post<any>(`/api/accounts/${a.accountId}/messages`, buildPayload(a, true));
      return {
        content: [{
          type: "text" as const,
          text: `✅ Draft saved.\n\nTo: ${a.toAddress}\nSubject: ${a.subject}\nMessage ID: ${res.data?.messageId}\n\nOpen Zoho Mail to review and send.`,
        }],
      };
    },
  );

  server.tool(
    "send_email",
    `Send an email or reply via Zoho Mail.

⚠️  ALWAYS follow this sequence before calling this tool:
1. Show the user a full preview: To, CC (if any), Subject, and the full body.
2. Ask explicitly: "Confirm sending?"
3. Only call this tool after the user confirms in the same conversation turn (e.g. "yes", "send it").
Never send without explicit user approval.`,
    composeShape,
    async (a) => {
      const res = await client.post<any>(`/api/accounts/${a.accountId}/messages`, buildPayload(a, false));
      return {
        content: [{
          type: "text" as const,
          text: `✅ Email sent.\n\nTo: ${a.toAddress}\nSubject: ${a.subject}\nMessage ID: ${res.data?.messageId}`,
        }],
      };
    },
  );

  // ── Organize ──
  const actionMap: Record<string, Record<string, unknown>> = {
    markAsRead: { mode: "markAsRead", isRead: true },
    markAsUnread: { mode: "markAsRead", isRead: false },
    flag: { mode: "flag", isFlagged: true },
    unflag: { mode: "flag", isFlagged: false },
    archive: { mode: "archive", isArchive: true },
    unarchive: { mode: "archive", isArchive: false },
    markAsSpam: { mode: "spam", isSpam: true },
    markAsNotSpam: { mode: "spam", isSpam: false },
  };

  server.tool(
    "update_email",
    "Update email status — mark read/unread, flag, archive, or mark as spam.",
    {
      accountId: acct,
      messageId: z.string(),
      action: z
        .enum([
          "markAsRead", "markAsUnread", "flag", "unflag",
          "archive", "unarchive", "markAsSpam", "markAsNotSpam",
        ])
        .describe("Action to perform on the email"),
    },
    async ({ accountId, messageId, action }) => {
      await client.put(`/api/accounts/${accountId}/updatemessage`, {
        messageId: [messageId],
        ...actionMap[action],
      });
      return json({ messageId, action, status: "Updated successfully" });
    },
  );

  server.tool(
    "move_email",
    "Move an email to a different folder.",
    {
      accountId: acct,
      messageId: z.string(),
      destinationFolderId: z.string().describe("Target folder ID from list_folders"),
    },
    async ({ accountId, messageId, destinationFolderId }) => {
      await client.put(`/api/accounts/${accountId}/updatemessage`, {
        messageId: [messageId],
        mode: "moveMessage",
        destfolderId: destinationFolderId,
      });
      return json({ messageId, destinationFolderId, status: "Moved successfully" });
    },
  );

  server.tool(
    "apply_label",
    "Apply or remove a label/tag on an email.",
    {
      accountId: acct,
      messageId: z.string(),
      labelId: z.string().describe("Label ID to apply or remove"),
      remove: z.boolean().default(false).describe("Set true to remove the label instead of adding it"),
    },
    async ({ accountId, messageId, labelId, remove }) => {
      await client.put(`/api/accounts/${accountId}/updatemessage`, {
        messageId: [messageId],
        mode: remove ? "removeLabel" : "addLabel",
        labelid: [labelId],
      });
      return json({
        messageId,
        labelId,
        action: remove ? "removed" : "applied",
        status: "Label updated successfully",
      });
    },
  );
}
