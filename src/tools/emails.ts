import { zohoGet, zohoPost } from '../client.js';

// ── List emails ──────────────────────────────────────────────────────────────

export async function listEmails(
  accountId: string,
  folderId?: string,
  limit = 20,
  start = 0
) {
  const params: Record<string, unknown> = { limit, start };
  if (folderId) params.folderId = folderId;

  const res = await zohoGet<any>(`/api/accounts/${accountId}/messages/view`, params);
  const messages = res.data ?? [];
  return messages.map((m: any) => ({
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
}

// ── Search emails ────────────────────────────────────────────────────────────

export async function searchEmails(
  accountId: string,
  query: string,
  limit = 20
) {
  const res = await zohoGet<any>(`/api/accounts/${accountId}/messages/search`, {
    searchKey: query,
    limit,
  });
  const messages = res.data ?? [];
  return messages.map((m: any) => ({
    messageId: m.messageId,
    subject: m.subject,
    fromAddress: m.fromAddress,
    toAddress: m.toAddress,
    receivedTime: m.receivedTime,
    isRead: m.isRead,
    folderId: m.folderId,
    summary: m.summary,
  }));
}

// ── Get full email ───────────────────────────────────────────────────────────

export async function getEmail(accountId: string, folderId: string, messageId: string) {
  const [content, details] = await Promise.all([
    zohoGet<any>(`/api/accounts/${accountId}/folders/${folderId}/messages/${messageId}/content`),
    zohoGet<any>(`/api/accounts/${accountId}/folders/${folderId}/messages/${messageId}/details`),
  ]);

  return {
    messageId,
    subject: details.data?.subject,
    fromAddress: details.data?.fromAddress,
    toAddress: details.data?.toAddress,
    ccAddress: details.data?.ccAddress,
    receivedTime: details.data?.receivedTime,
    content: content.data?.content,
    isRead: details.data?.isRead,
    hasAttachment: details.data?.hasAttachment,
  };
}

// ── List thread ──────────────────────────────────────────────────────────────

export async function listThreads(accountId: string, threadId: string) {
  const res = await zohoGet<any>(`/api/accounts/${accountId}/messages/${threadId}/thread`);
  const messages = res.data ?? [];
  return messages.map((m: any) => ({
    messageId: m.messageId,
    subject: m.subject,
    fromAddress: m.fromAddress,
    receivedTime: m.receivedTime,
    summary: m.summary,
  }));
}

// ── Save draft ───────────────────────────────────────────────────────────────

export async function saveDraft(
  accountId: string,
  opts: {
    toAddress: string;
    subject: string;
    content: string;
    ccAddress?: string;
    replyToMessageId?: string;
  }
) {
  const payload: Record<string, unknown> = {
    toAddress: opts.toAddress,
    subject: opts.subject,
    content: opts.content,
    mailFormat: 'html',
    action: 'draft',
  };
  if (opts.ccAddress) payload.ccAddress = opts.ccAddress;
  if (opts.replyToMessageId) payload.inReplyTo = opts.replyToMessageId;

  const res = await zohoPost<any>(`/api/accounts/${accountId}/messages`, payload);
  return {
    messageId: res.data?.messageId,
    status: 'Draft saved successfully',
  };
}

// ── Send email ───────────────────────────────────────────────────────────────
// IMPORTANT: Claude must always show a full preview (to, subject, body) and
// receive explicit user confirmation before calling this tool.

export async function sendEmail(
  accountId: string,
  opts: {
    toAddress: string;
    subject: string;
    content: string;
    ccAddress?: string;
    replyToMessageId?: string;
  }
) {
  const payload: Record<string, unknown> = {
    toAddress: opts.toAddress,
    subject: opts.subject,
    content: opts.content,
    mailFormat: 'html',
  };
  if (opts.ccAddress) payload.ccAddress = opts.ccAddress;
  if (opts.replyToMessageId) payload.inReplyTo = opts.replyToMessageId;

  const res = await zohoPost<any>(`/api/accounts/${accountId}/messages`, payload);
  return {
    messageId: res.data?.messageId,
    status: 'Email sent successfully',
    toAddress: opts.toAddress,
    subject: opts.subject,
  };
}
