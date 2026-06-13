import type {
  Wallet, BalanceEntry, CheckInResult, SweepWalletResult, SweepMode, TxResult,
  SchedulerState, WalletCheckinStats, CheckinLogEntry,
  TopupConfig, TopupRunSummary, TopupRunState, TopupLogEntry,
  WalletStakingInfo,
} from './types';
import { getIdToken } from './firebase';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(url: string, init?: RequestInit & { headers?: Record<string, string> }): Promise<T> {
  const { headers: extraHeaders, ...rest } = init ?? {};
  const authHeaders = await getAuthHeaders();
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...extraHeaders,
    },
    ...rest,
  });
  if (res.status === 401) {
    window.location.reload();
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as any).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

async function requestBlob(url: string): Promise<{ blob: Blob; filename: string }> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(url, {
    credentials: 'include',
    headers: authHeaders,
  });
  if (res.status === 401) {
    window.location.reload();
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as any).error ?? res.statusText);
  }
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? 'export';
  const blob = await res.blob();
  return { blob, filename };
}

export const api = {
  // Wallets
  getWallets: () => request<Wallet[]>('/api/wallets'),

  importWallets: async (rawText: string) => {
    const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    const data = btoa(unescape(encodeURIComponent(text)));
    const authHeaders = await getAuthHeaders();
    const res = await fetch('/api/wallets/import', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...authHeaders },
      body: new URLSearchParams({ data }).toString(),
    });
    if (res.status === 401) { window.location.reload(); throw new Error('Unauthorized'); }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as any).error ?? res.statusText);
    }
    return res.json() as Promise<{ imported: number; skipped: number; errors: string[] }>;
  },

  deleteWallet: (id: string) =>
    request<{ removed: boolean }>(`/api/wallets/${id}`, { method: 'DELETE' }),

  renameWallet: (id: string, label: string) =>
    request<{ ok: boolean }>(`/api/wallets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ label }),
    }),

  // Balances
  getBalance: (id: string) =>
    request<BalanceEntry['balances']>(`/api/wallets/${id}/balance`),

  getBalances: (ids?: string[]) =>
    request<BalanceEntry[]>('/api/balances', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  // Manual check-in (selected wallets)
  checkin: (ids: string[]) =>
    request<CheckInResult[]>('/api/checkin', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  // Scheduler
  getSchedule:      () => request<SchedulerState>('/api/checkin/schedule'),
  triggerSchedule:  () => request<{ started: boolean }>('/api/checkin/run', { method: 'POST' }),
  getCheckinStats:  () => request<WalletCheckinStats[]>('/api/checkin/stats'),
  getCheckinHistory: (limit = 100) =>
    request<CheckinLogEntry[]>(`/api/checkin/history?limit=${limit}`),

  // Transfer
  transfer: (params: {
    fromId: string;
    to: string;
    chain: 'hub' | 'rollup';
    amountUmec: number;
    denom?: string;
  }) =>
    request<TxResult>('/api/transfer', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // Sweep
  startSweep: (params: {
    ids: string[];
    mode: SweepMode;
    destination: string;
    minHubReserve: number;
    masterWalletId?: string;
    minWithdrawableUmec?: number;
  }) =>
    request<{ started: boolean; total: number }>('/api/sweep', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getSweepStatus: () =>
    request<{ running: boolean; total: number; done: number; results: SweepWalletResult[]; error?: string }>('/api/sweep/status'),

  // Staking
  getStaking: (walletId: string) =>
    request<WalletStakingInfo>(`/api/staking/${walletId}`),

  claimRewards: (walletId: string) =>
    request<TxResult>('/api/staking/claim', {
      method: 'POST',
      body: JSON.stringify({ walletId }),
    }),

  undelegate: (walletId: string, validatorAddress: string, amountUmec: number) =>
    request<TxResult>('/api/staking/undelegate', {
      method: 'POST',
      body: JSON.stringify({ walletId, validatorAddress, amountUmec }),
    }),

  exportWallets: (format: 'csv' | 'json', category: 'all' | 'verified' | 'unverified') =>
    requestBlob(`/api/export?format=${format}&category=${category}`),

  // Top-Up
  getTopupConfig: () => request<TopupConfig>('/api/topup/config'),
  setTopupConfig: (cfg: Partial<TopupConfig>) =>
    request<TopupConfig>('/api/topup/config', {
      method: 'POST',
      body: JSON.stringify(cfg),
    }),
  runTopup:        () => request<{ started: boolean }>('/api/topup/run', { method: 'POST' }),
  getTopupStatus:  () => request<TopupRunState>('/api/topup/status'),
  getTopupHistory: (limit = 100) =>
    request<TopupLogEntry[]>(`/api/topup/history?limit=${limit}`),

  getMigrationStatus: () =>
    request<{ total: number; missing: number; synced: number; migrating: boolean }>('/api/admin/migrate-status'),
  triggerMigration: () =>
    request<{ total: number; synced: number; alreadyHad: number; noCredentials: number; errors: string[] }>(
      '/api/admin/migrate-credentials', { method: 'POST' }
    ),

  syncFirebase: () =>
    request<{ imported: number; skipped: number; errors: string[] }>(
      '/api/sync-firebase', { method: 'POST' }
    ),
};
