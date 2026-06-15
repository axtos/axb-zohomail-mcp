import { zohoGet } from '../client.js';

export async function getAttachmentInfo(
  accountId: string,
  folderId: string,
  messageId: string
) {
  const res = await zohoGet<any>(
    `/api/accounts/${accountId}/folders/${folderId}/messages/${messageId}/attachmentinfo`
  );
  return res.data ?? [];
}

export async function getAttachment(
  accountId: string,
  folderId: string,
  messageId: string,
  attachmentId: string
) {
  // Returns base64 or raw content — Zoho returns the file as a stream.
  // We return metadata + download URL for Claude to surface to the user.
  const info = await getAttachmentInfo(accountId, folderId, messageId);
  const match = info.find((a: any) => a.attachmentId === attachmentId);
  return {
    attachmentId,
    fileName: match?.fileName ?? 'unknown',
    fileSize: match?.size ?? 0,
    mimeType: match?.mimeType ?? 'application/octet-stream',
    note: 'Attachment identified. Download directly from Zoho Mail to access file contents.',
  };
}
