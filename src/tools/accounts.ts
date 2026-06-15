import { zohoGet } from '../client.js';

export async function getAccounts() {
  const res = await zohoGet<any>('/api/accounts');
  const accounts = res.data ?? [];
  return accounts.map((a: any) => ({
    accountId: a.accountId,
    emailAddress: a.emailAddress,
    displayName: a.displayName,
    isPrimary: a.isPrimary,
  }));
}
