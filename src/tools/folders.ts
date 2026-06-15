import { zohoGet } from '../client.js';

export async function listFolders(accountId: string) {
  const res = await zohoGet<any>(`/api/accounts/${accountId}/folders`);
  const folders = res.data ?? [];
  return folders.map((f: any) => ({
    folderId: f.folderId,
    folderName: f.folderName,
    path: f.path,
    unreadCount: f.unreadCount,
    messageCount: f.messageCount,
  }));
}
