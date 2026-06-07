import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useApp } from '../App';
import type { TxResult } from '../types';

const UMEC_PER_MEC = 100_000_000; // exponent 8 per chain denom_metadata
const HUB_FEE_UMEC = 12_000; // 0.00012 MEC

function fmtMec(umec: number): string {
  const mec = umec / UMEC_PER_MEC;
  if (umec === 0) return '0 MEC';
  if (mec >= 1) return mec.toFixed(4) + ' MEC';
  return mec.toFixed(8) + ' MEC';
}

function mecToUmec(mec: string): number {
  const v = parseFloat(mec);
  if (isNaN(v) || v <= 0) return 0;
  return Math.floor(v * UMEC_PER_MEC);
}

export function TransferTab() {
  const { wallets, setWallets, balances, setBalance } = useApp();
  const [fromId, setFromId] = useState('');
  const [to, setTo] = useState('');
  const [chain, setChain] = useState<'hub' | 'rollup'>('hub');
  const [amount, setAmount] = useState(''); // always in MEC
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<TxResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    api.getWallets().then(ws => {
      setWallets(ws);
      if (ws.length > 0 && !initialized.current) {
        setFromId(ws[0].id);
        initialized.current = true;
      }
    }).catch(() => {});
  }, [setWallets]);

  // Load balance whenever fromId changes
  useEffect(() => {
    if (!fromId) return;
    api.getBalance(fromId)
      .then(b => setBalance(fromId, b))
      .catch(() => {});
  }, [fromId, setBalance]);

  const fromWallet = wallets.find(w => w.id === fromId);
  const fromBalance = fromId ? balances[fromId] : null;

  const setMax = () => {
    if (!fromBalance) return;
    let maxUmec = 0;
    if (chain === 'hub') {
      maxUmec = Math.max(0, fromBalance.hub - HUB_FEE_UMEC * 2);
    } else {
      maxUmec = fromBalance.rollupTotal;
    }
    setAmount((maxUmec / UMEC_PER_MEC).toFixed(6));
  };

  const handleSend = async () => {
    if (!fromId || !to.trim() || !amount) return;
    const amountUmec = mecToUmec(amount);
    if (amountUmec <= 0) { setError('Enter a valid amount greater than 0'); return; }
    if (chain === 'hub' && amountUmec < 1) { setError('Minimum hub transfer: 0.00000001 MEC (1 umec)'); return; }

    setSending(true);
    setResult(null);
    setError(null);
    try {
      const r = await api.transfer({ fromId, to: to.trim(), chain, amountUmec });
      setResult(r);
      if (r.success) {
        // Refresh balance after send
        api.getBalance(fromId).then(b => setBalance(fromId, b)).catch(() => {});
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const amountUmec = mecToUmec(amount);
  const isValid = fromId && to.trim() && amountUmec > 0;

  return (
    <div className="max-w-xl space-y-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-5">
        <h2 className="text-sm font-semibold text-white">Manual P2P Transfer</h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-300 flex items-center gap-2">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="ml-auto">✕</button>
          </div>
        )}

        {/* From */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">From Wallet</label>
          <select
            value={fromId}
            onChange={e => { setFromId(e.target.value); setResult(null); setAmount(''); }}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="">Select wallet…</option>
            {wallets.map(w => (
              <option key={w.id} value={w.id}>{w.label} — {w.address.slice(0, 16)}…</option>
            ))}
          </select>
          {fromBalance && (
            <div className="flex gap-4 text-xs mt-1">
              <span className="text-slate-400">Hub: <span className={`font-mono font-medium ${chain === 'hub' ? 'text-emerald-400' : 'text-slate-400'}`}>{fmtMec(fromBalance.hub)}</span></span>
              <span className="text-slate-400">Rollup: <span className={`font-mono font-medium ${chain === 'rollup' ? 'text-purple-400' : 'text-slate-400'}`}>{fmtMec(fromBalance.rollupTotal)}</span></span>
            </div>
          )}
        </div>

        {/* Chain */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Chain</label>
          <div className="flex gap-2">
            {(['hub', 'rollup'] as const).map(c => (
              <button
                key={c}
                onClick={() => { setChain(c); setAmount(''); setResult(null); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  chain === c ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {c === 'hub' ? '🔵 ME-Hub' : '🟣 Rollup'}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            {chain === 'hub'
              ? 'Sends MEC on me-hub chain. Network fee: 0.00012 MEC (12,000 umec) deducted from sender.'
              : 'Sends tokens on the rollup chain. Zero fee.'}
          </p>
        </div>

        {/* To */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">To Address</label>
          <div className="flex gap-2">
            <input
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="me1…"
              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
            />
            <select
              onChange={e => { if (e.target.value) setTo(wallets.find(w => w.id === e.target.value)?.address ?? ''); }}
              className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
              defaultValue=""
            >
              <option value="">My wallets</option>
              {wallets.filter(w => w.id !== fromId).map(w => (
                <option key={w.id} value={w.id}>{w.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Amount (MEC)</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.000000"
              min={0}
              step={0.000001}
              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
            />
            <button
              onClick={setMax}
              disabled={!fromBalance}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-xs text-slate-300 rounded-lg transition-colors"
            >
              Max
            </button>
          </div>
          {amountUmec > 0 && (
            <p className="text-xs text-slate-500">
              = {amountUmec.toLocaleString()} umec
              {chain === 'hub' && (
                <span className="ml-2 text-amber-500">+ 0.00012 MEC fee</span>
              )}
            </p>
          )}
        </div>

        <button
          onClick={handleSend}
          disabled={sending || !isValid}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {sending ? '⏳ Broadcasting transaction…' : '💸 Send Transaction'}
        </button>

        {result && (
          <div className={`rounded-lg p-3 text-sm ${result.success ? 'bg-green-500/10 border border-green-500/30 text-green-300' : 'bg-red-500/10 border border-red-500/30 text-red-300'}`}>
            {result.success ? (
              <>
                <p className="font-semibold">✅ Transaction Sent!</p>
                <p className="text-xs font-mono mt-1 break-all opacity-80">TX: {result.txHash}</p>
              </>
            ) : (
              <>
                <p className="font-semibold">❌ Transfer Failed</p>
                <p className="text-xs mt-1 break-all">{result.error}</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 space-y-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Denomination Reference</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
          <div>1 MEC = 100,000,000 umec</div>
          <div>Hub fee: 0.00012 MEC (12,000 umec)</div>
          <div>Rollup fee: 0.0001 MEC (10,000 umec)</div>
          <div>Min transfer: 0.00000001 MEC (1 umec)</div>
        </div>
      </div>
    </div>
  );
}
