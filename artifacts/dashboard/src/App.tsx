import { useState, useCallback, createContext, useContext, useEffect } from 'react';
import type { Wallet, BalanceEntry } from './types';
import { WalletsTab } from './components/WalletsTab';
import { CheckInTab } from './components/CheckInTab';
import { TransferTab } from './components/TransferTab';
import { SweepTab } from './components/SweepTab';
import { StakingTab } from './components/StakingTab';
import { ExportTab } from './components/ExportTab';
import { TopUpTab } from './components/TopUpTab';

export interface AppState {
  wallets: Wallet[];
  balances: Record<string, BalanceEntry['balances']>;
  setWallets: (w: Wallet[]) => void;
  setBalance: (id: string, b: BalanceEntry['balances']) => void;
}

export const AppCtx = createContext<AppState>({
  wallets: [],
  balances: {},
  setWallets: () => {},
  setBalance: () => {},
});

export const useApp = () => useContext(AppCtx);

const TABS = [
  { id: 'wallets',  label: '💼 Wallets' },
  { id: 'checkin',  label: '✅ Check-In' },
  { id: 'topup',    label: '💰 Top-Up' },
  { id: 'transfer', label: '💸 Transfer' },
  { id: 'sweep',    label: '🔄 Auto-Sweep' },
  { id: 'staking',  label: '🏆 Staking' },
  { id: 'export',   label: '📤 Export' },
] as const;

type TabId = (typeof TABS)[number]['id'];

interface AuthUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export default function App() {
  const [tab, setTab]             = useState<TabId>('wallets');
  const [wallets, setWallets]     = useState<Wallet[]>([]);
  const [balances, setBalancesMap] = useState<Record<string, BalanceEntry['balances']>>({});

  const [user, setUser]           = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    fetch('/api/auth/user', { credentials: 'include' })
      .then(r => {
        if (r.status === 401) return null;
        if (!r.ok) throw new Error('auth check failed');
        return r.json() as Promise<AuthUser>;
      })
      .then(u => { setUser(u); setAuthReady(true); })
      .catch(() => { setUser(null); setAuthReady(true); });
  }, []);

  const setBalance = useCallback((id: string, b: BalanceEntry['balances']) => {
    setBalancesMap(prev => ({ ...prev, [id]: b }));
  }, []);

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <span className="text-slate-500 text-sm animate-pulse">Loading…</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <span className="text-5xl">🌍</span>
            <h1 className="mt-3 text-2xl font-bold text-white">Meta Earth Dashboard</h1>
            <p className="mt-1 text-sm text-slate-400">Sign in to manage your wallets</p>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl">
            <a
              href="/api/login"
              className="block w-full py-2.5 text-center bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Log in
            </a>
          </div>
          <p className="mt-4 text-center text-xs text-slate-600">
            Access restricted — authorised users only
          </p>
        </div>
      </div>
    );
  }

  const network = import.meta.env.VITE_NETWORK ?? 'mainnet';
  const displayName = user.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user.email ?? 'User';

  return (
    <AppCtx.Provider value={{ wallets, balances, setWallets, setBalance }}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <header className="border-b border-slate-800 bg-slate-900 px-6 py-4 flex items-center gap-3 shrink-0">
          <span className="text-2xl">🌍</span>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Meta Earth Dashboard</h1>
            <p className="text-xs text-slate-400">Wallet Manager · Check-In · Transfer · Auto-Sweep</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {network.charAt(0).toUpperCase() + network.slice(1)}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 hidden sm:block truncate max-w-[160px]">{displayName}</span>
              <button
                onClick={handleLogout}
                className="text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <nav className="border-b border-slate-800 bg-slate-900 px-6 flex gap-1 shrink-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <main className="flex-1 overflow-auto p-6">
          {tab === 'wallets'  && <WalletsTab />}
          {tab === 'checkin'  && <CheckInTab />}
          {tab === 'topup'    && <TopUpTab />}
          {tab === 'transfer' && <TransferTab />}
          {tab === 'sweep'    && <SweepTab />}
          {tab === 'staking'  && <StakingTab />}
          {tab === 'export'   && <ExportTab />}
        </main>
      </div>
    </AppCtx.Provider>
  );
}
