import { zohoPut } from '../client.js';

type UpdateAction =
  | 'markAsRead'
  | 'markAsUnread'
  | 'flag'
  | 'unflag'
  | 'archive'
  | 'unarchive'
  | 'markAsSpam'
  | 'markAsNotSpam';

export async function updateEmail(
  accountId: string,
  messageId: string,
  action: UpdateAction
) {
  const actionMap: Record<UpdateAction, Record<string, unknown>> = {
    markAsRead: { mode: 'markAsRead', isRead: true },
    markAsUnread: { mode: 'markAsRead', isRead: false },
    flag: { mode: 'flag', isFlagged: true },
    unflag: { mode: 'flag', isFlagged: false },
    archive: { mode: 'archive', isArchive: true },
    unarchive: { mode: 'archive', isArchive: false },
    markAsSpam: { mode: 'spam', isSpam: true },
    markAsNotSpam: { mode: 'spam', isSpam: false },
  };

  await zohoPut(`/api/accounts/${accountId}/updatemessage`, {
    messageId,
    ...actionMap[action],
  });

  return { messageId, action, status: 'Updated successfully' };
}

export async function moveEmail(
  accountId: string,
  messageId: string,
  destinationFolderId: string
) {
  await zohoPut(`/api/accounts/${accountId}/updatemessage`, {
    messageId,
    mode: 'move',
    folderId: destinationFolderId,
  });

  return { messageId, destinationFolderId, status: 'Moved successfully' };
}

export async function applyLabel(
  accountId: string,
  messageId: string,
  labelId: string,
  remove = false
) {
  await zohoPut(`/api/accounts/${accountId}/updatemessage`, {
    messageId,
    mode: remove ? 'removeLabel' : 'addLabel',
    labelId,
  });

  return {
    messageId,
    labelId,
    action: remove ? 'removed' : 'applied',
    status: 'Label updated successfully',
  };
}
