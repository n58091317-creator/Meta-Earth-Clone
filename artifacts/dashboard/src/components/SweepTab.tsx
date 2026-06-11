import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useApp } from '../App';
import type { SweepWalletResult, SweepMode } from '../types';

const UMEC_PER_MEC = 100_000_000;

const MODES: { id: SweepMode; label: string; desc: string }[] = [
  { id: 'all',     label: '🔄 All-Inclusive', desc: 'Smart staking withdrawal → sweep hub balance (minus reserve) → sweep rollup tokens.' },
  { id: 'hub',     label: '🔵 Hub Only',       desc: 'Send hub MEC to destination, keeping min reserve for fees.' },
  { id: 'rollup',  label: '🟣 Rollup Only',    desc: 'Send all rollup tokens to destination address (zero fee).' },
  { id: 'staking', label: '🏆 Staking Only',   desc: 'Smart withdraw: checks threshold → funds gas if needed → withdraws rewards.' },
];

function shortAddr(a: string) {
  return a ? a.slice(0, 10) + '…' + a.slice(-6) : '';
}

function mecToUmec(mec: string): number {
  const v = parseFloat(mec);
  return isNaN(v) ? 0 : Math.floor(v * UMEC_PER_MEC);
}

const needsStakingControls = (mode: SweepMode) => mode === 'staking' || mode === 'all';
const needsDestination     = (mode: SweepMode) => mode !== 'staking';

export function SweepTab() {
  const { wallets, setWallets } = useApp();
  const [mode, setMode]                       = useState<SweepMode>('staking');
  const [destination, setDestination]         = useState('');
  const [minReserveMec, setMinReserveMec]     = useState('0.05');
  const [minWithdrawMec, setMinWithdrawMec]   = useState('0.0002');
  const [masterWalletId, setMasterWalletId]   = useState('');
  const [selected, setSelected]               = useState<Set<string>>(new Set());
  const [running, setRunning]                 = useState(false);
  const [progress, setProgress]               = useState<{ done: number; total: number } | null>(null);
  const [results, setResults]                 = useState<SweepWalletResult[]>([]);
  const [error, setError]                     = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.getWallets().then(ws => {
      setWallets(ws);
      setSelected(new Set(ws.map(w => w.id)));
      // Pre-select Wallet 2 as master if available
      const w2 = ws.find(w => w.label === 'Wallet 2');
      if (w2) setMasterWalletId(w2.id);
    }).catch(() => {});

    // On mount: check if a sweep is already running (e.g. from a previous tab visit)
    api.getSweepStatus().then(s => {
      if (s.running || s.results.length > 0) {
        setRunning(s.running);
        setResults(s.results);
        setProgress({ done: s.done, total: s.total });
        if (s.running) startPolling();
      }
    }).catch(() => {});

    return () => stopPolling();
  }, [setWallets]);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const startPolling = () => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const s = await api.getSweepStatus();
        setResults(s.results);
        setProgress({ done: s.done, total: s.total });
        if (s.error) setError(s.error);
        if (!s.running) {
          setRunning(false);
          stopPolling();
        }
      } catch {}
    }, 2000);
  };

  const allSelected = wallets.length > 0 && selected.size === wallets.length;

  const toggleWallet = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(wallets.map(w => w.id)));
  };

  const runSweep = async () => {
    setError(null);
    if (needsDestination(mode) && !destination.trim()) { setError('Enter a destination address.'); return; }
    if (selected.size === 0) { setError('Select at least one wallet.'); return; }

    const minReserveUmec      = mecToUmec(minReserveMec);
    const minWithdrawableUmec = mecToUmec(minWithdrawMec);

    const confirmMsg = mode === 'staking'
      ? `Withdraw staking rewards for ${selected.size} wallet(s)?\n\nMin threshold: ${minWithdrawMec} MEC${masterWalletId ? '\nWallet 2 will fund gas if needed' : ''}`
      : `Run ${mode === 'all' ? 'all-inclusive' : mode + '-only'} sweep for ${selected.size} wallet(s)?\n\nDestination: ${shortAddr(destination)}\nMin reserve: ${minReserveMec} MEC`;
    if (!confirm(confirmMsg)) return;

    try {
      const r = await api.startSweep({
        ids:                 [...selected],
        mode,
        destination:         destination.trim(),
        minHubReserve:       minReserveUmec,
        masterWalletId:      masterWalletId || undefined,
        minWithdrawableUmec: needsStakingControls(mode) ? minWithdrawableUmec : undefined,
      });
      setRunning(true);
      setResults([]);
      setProgress({ done: 0, total: r.total });
      startPolling();
    } catch (e: any) {
      setError('Failed to start sweep: ' + e.message);
    }
  };

  const successCount = results.filter(r => r.steps.some(s => s.success && !s.note)).length;
  const skippedCount = results.filter(r => r.steps.every(s => !s.success || s.note?.toLowerCase().includes('skip') || s.note?.toLowerCase().includes('threshold'))).length;
  const errorCount   = results.length - successCount - skippedCount;

  return (
    <div className="space-y-4 max-w-3xl">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-300 flex items-center gap-2">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}

      {/* Config Panel */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-5">
        <h2 className="text-sm font-semibold text-white">Auto-Sweeper Configuration</h2>

        {/* Mode */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Sweep Mode</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                disabled={running}
                className={`text-left px-4 py-3 rounded-lg border transition-colors disabled:opacity-50 ${
                  mode === m.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-600 bg-slate-900 hover:border-slate-500'
                }`}
              >
                <p className={`text-sm font-medium ${mode === m.id ? 'text-blue-300' : 'text-slate-200'}`}>{m.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Destination */}
        {needsDestination(mode) && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Destination Address</label>
            <div className="flex gap-2">
              <input
                value={destination}
                onChange={e => setDestination(e.target.value)}
                disabled={running}
                placeholder="me1… (master/consolidation address)"
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-blue-500 placeholder:text-slate-600 disabled:opacity-50"
              />
              <select
                onChange={e => { if (e.target.value) setDestination(wallets.find(w => w.id === e.target.value)?.address ?? ''); }}
                disabled={running}
                className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                defaultValue=""
              >
                <option value="">My wallets</option>
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>{w.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Min Hub Reserve */}
        {(mode === 'all' || mode === 'hub') && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Min Hub Reserve (MEC)</label>
            <input
              type="number"
              value={minReserveMec}
              onChange={e => setMinReserveMec(e.target.value)}
              disabled={running}
              min={0.012} step={0.001}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-slate-500">MEC kept on hub for future fees. Default 0.05 MEC.</p>
          </div>
        )}

        {/* Staking controls */}
        {needsStakingControls(mode) && (
          <div className="border border-amber-500/20 bg-amber-500/5 rounded-lg p-4 space-y-4">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">⚡ Smart Staking Withdrawal</p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Min Withdrawable Threshold (MEC)</label>
              <input
                type="number"
                value={minWithdrawMec}
                onChange={e => setMinWithdrawMec(e.target.value)}
                disabled={running}
                min={0} step={0.0001}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-amber-500 disabled:opacity-50"
              />
              <p className="text-xs text-slate-500">Wallets with rewards below this amount are skipped. Default: 0.0002 MEC.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Master Wallet <span className="normal-case font-normal text-slate-500">(auto-funds gas for wallets that need it)</span>
              </label>
              <select
                value={masterWalletId}
                onChange={e => setMasterWalletId(e.target.value)}
                disabled={running}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-amber-500 disabled:opacity-50"
              >
                <option value="">— None (skip wallets without gas) —</option>
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>{w.label} ({shortAddr(w.address)})</option>
                ))}
              </select>
              <p className="text-xs text-slate-500">If a wallet has rewards but no gas, this wallet sends 0.0002 MEC to cover the fee before retrying.</p>
            </div>
          </div>
        )}
      </div>

      {/* Wallet Selection */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Wallets to Sweep ({selected.size}/{wallets.length})
          </span>
          <button onClick={toggleSelectAll} disabled={running} className="text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-40">
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="divide-y divide-slate-700/50 max-h-48 overflow-y-auto">
          {wallets.map(w => (
            <label key={w.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-700/30 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.has(w.id)}
                onChange={() => toggleWallet(w.id)}
                disabled={running}
                className="rounded border-slate-600 bg-slate-700 text-blue-500"
              />
              <span className="text-sm text-slate-200 flex-1">{w.label}</span>
              <span className="text-xs text-slate-500 font-mono">{shortAddr(w.address)}</span>
            </label>
          ))}
          {wallets.length === 0 && (
            <p className="text-center py-6 text-slate-500 text-sm">No wallets imported yet.</p>
          )}
        </div>
      </div>

      {/* Progress bar (visible while running) */}
      {running && progress && (
        <div className="bg-slate-800 rounded-xl border border-amber-500/30 p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-amber-300 font-medium">⏳ Sweep in progress…</span>
            <span className="text-slate-400">{progress.done} / {progress.total} wallets</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="h-2 bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">Running in background — you can navigate away. Results appear below as each wallet is processed.</p>
        </div>
      )}

      <button
        onClick={runSweep}
        disabled={running || selected.size === 0 || (needsDestination(mode) && !destination.trim())}
        className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {running
          ? `⏳ Sweeping… (${progress?.done ?? 0}/${progress?.total ?? selected.size})`
          : `🔄 Run ${MODES.find(m => m.id === mode)?.label ?? 'Sweep'} (${selected.size} wallet${selected.size !== 1 ? 's' : ''})`}
      </button>

      {/* Summary when done */}
      {!running && results.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Successful', value: successCount, color: 'text-green-400' },
            { label: 'Skipped',    value: skippedCount, color: 'text-amber-400' },
            { label: 'Errors',     value: errorCount,   color: 'text-red-400'   },
          ].map(s => (
            <div key={s.label} className="bg-slate-800 rounded-lg p-3 border border-slate-700 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Results {running ? `(${results.length} so far…)` : `(${results.length} total)`}
          </p>
          {results.map(r => (
            <div key={r.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-700 flex items-center gap-2">
                <span className="text-sm font-medium text-slate-200">{r.label}</span>
                <span className="text-xs text-slate-500 font-mono">{shortAddr(r.address)}</span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                  r.steps.some(s => s.success && !s.note)
                    ? 'bg-green-500/20 text-green-300'
                    : r.steps.every(s => s.note?.toLowerCase().includes('skip') || s.note?.toLowerCase().includes('threshold'))
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-red-500/20 text-red-300'
                }`}>
                  {r.steps.filter(s => s.success).length}/{r.steps.length} steps OK
                </span>
              </div>
              <div className="divide-y divide-slate-700/30">
                {r.steps.map((s, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-start gap-2">
                    <span className="text-sm mt-0.5 shrink-0">{s.success && !s.note ? '✅' : s.note ? '⚠️' : '❌'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-300">{s.step}</p>
                      {s.txHash && <p className="text-xs text-slate-500 font-mono mt-0.5 break-all">TX: {s.txHash}</p>}
                      {s.error && <p className="text-xs text-red-400 mt-0.5">{s.error}</p>}
                      {s.note && <p className="text-xs text-amber-400 mt-0.5">{s.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
