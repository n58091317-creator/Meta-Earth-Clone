import { useState, useCallback, createContext, useContext, useEffect } from 'react';
import type { Wallet, BalanceEntry } from './types';
import { WalletsTab } from './components/WalletsTab';
import { CheckInTab } from './components/CheckInTab';
import { TransferTab } from './components/TransferTab';
import { SweepTab } from './components/SweepTab';
import { StakingTab } from './components/StakingTab';
import { ExportTab } from './components/ExportTab';
import { TopUpTab } from './components/TopUpTab';
import { LoginPage } from './components/LoginPage';
import { auth, onAuthStateChanged, signOut, type User } from './firebase';

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

export default function App() {
  const [tab, setTab]             = useState<TabId>('wallets');
  const [wallets, setWallets]     = useState<Wallet[]>([]);
  const [balances, setBalancesMap] = useState<Record<string, BalanceEntry['balances']>>({});

  // ── Firebase auth state ──────────────────────────────────────────────────
  const [user, setUser]           = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  const setBalance = useCallback((id: string, b: BalanceEntry['balances']) => {
    setBalancesMap(prev => ({ ...prev, [id]: b }));
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  // ── Loading splash ───────────────────────────────────────────────────────
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <span className="text-slate-500 text-sm animate-pulse">Loading…</span>
      </div>
    );
  }

  // ── Login gate ───────────────────────────────────────────────────────────
  if (!user) {
    return <LoginPage onLogin={() => {}} />;
  }

  // ── Authenticated dashboard ──────────────────────────────────────────────
  const network = import.meta.env.VITE_NETWORK ?? 'mainnet';

  return (
    <AppCtx.Provider value={{ wallets, balances, setWallets, setBalance }}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        {/* Header */}
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
              <span className="text-xs text-slate-400 hidden sm:block truncate max-w-[160px]">{user.email}</span>
              <button
                onClick={handleLogout}
                className="text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
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

        {/* Content */}
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
