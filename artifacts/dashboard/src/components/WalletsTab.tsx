import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { readRtdbCredentials } from '../firebase';
import { useApp } from '../App';

const UMEC_PER_MEC = 100_000_000;

type MigrationStatus = { total: number; missing: number; synced: number; migrating: boolean } | null;

function MigrationBanner() {
  const [status, setStatus]     = useState<MigrationStatus>(null);
  const [syncing, setSyncing]   = useState(false);
  const [result, setResult]     = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try { setStatus(await api.getMigrationStatus()); } catch {}
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  if (!status || status.missing === 0) return null;

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const r = await api.triggerMigration();
      setResult(
        r.errors.length > 0
          ? `⚠ Firestore quota still exceeded — try again after midnight UTC. (${r.errors[0]})`
          : `✓ Synced ${r.synced} wallet(s) successfully.`
      );
      await fetchStatus();
    } catch (e: any) {
      setResult('⚠ ' + (e.message ?? 'Sync failed'));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-amber-500/10 border border-amber-500/40 rounded-lg px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <span className="text-amber-300 font-medium">⚠ Credentials pending</span>
          <span className="text-amber-400/80 ml-2">
            {status.missing} of {status.total} wallet(s) still need their phrase/key stored in the database.
          </span>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
        >
          {syncing ? '⏳ Checking…' : '⟳ Check Status'}
        </button>
      </div>
      {result && (
        <p className={`mt-2 text-xs ${result.startsWith('✓') ? 'text-green-300' : 'text-amber-300'}`}>
          {result}
        </p>
      )}
    </div>
  );
}
function fmtMec(umec: number): string {
  const mec = umec / UMEC_PER_MEC;
  if (umec === 0) return '0 MEC';
  if (mec >= 1) return mec.toFixed(4) + ' MEC';
  return mec.toFixed(8) + ' MEC';
}

function shortAddr(a: string) {
  return a.slice(0, 12) + '…' + a.slice(-6);
}

type ModalMode = 'single' | 'bulk' | null;

export function WalletsTab() {
  const { wallets, setWallets, balances, setBalance } = useApp();
  const [modalMode, setModalMode] = useState<ModalMode>(null);

  // Single add
  const [singleLabel, setSingleLabel] = useState('');
  const [singleKey, setSingleKey]   = useState('');
  const [addingOne, setAddingOne]   = useState(false);
  const [addResult, setAddResult]   = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  // Bulk import
  const [importing, setImporting]     = useState(false);
  const [importText, setImportText]   = useState('');
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  // Inline rename
  const [renamingId, setRenamingId]     = useState<string | null>(null);
  const [renameValue, setRenameValue]   = useState('');
  const [savingRename, setSavingRename] = useState(false);

  // Firebase sync
  const [syncing, setSyncing]       = useState(false);
  const [syncResult, setSyncResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  // Other state
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [refreshingId, setRefreshingId]       = useState<string | null>(null);
  const [copied, setCopied]                   = useState<string | null>(null);
  const [error, setError]                     = useState<string | null>(null);

  const loadWallets = useCallback(async () => {
    try {
      const ws = await api.getWallets();
      setWallets(ws);
    } catch (e: any) {
      setError(e.message);
    }
  }, [setWallets]);

  useEffect(() => { loadWallets(); }, [loadWallets]);

  const openModal = (mode: ModalMode) => {
    setModalMode(mode);
    setAddResult(null); setSingleLabel(''); setSingleKey('');
    setImportResult(null); setImportText('');
  };

  const closeModal = () => setModalMode(null);

  // ── Single wallet add ────────────────────────────────────────────────────────
  const handleAddOne = async () => {
    const key = singleKey.trim();
    if (!key) return;
    setAddingOne(true);
    setAddResult(null);
    try {
      const payload = singleLabel.trim() ? `${key}` : key;
      const r = await api.importWallets(payload);
      setAddResult(r);
      if (r.imported > 0) {
        // Apply the custom label to the newly imported wallet
        if (singleLabel.trim()) {
          const fresh = await api.getWallets();
          const newest = fresh[fresh.length - 1];
          if (newest) await api.renameWallet(newest.id, singleLabel.trim());
        }
        await loadWallets();
      }
    } catch (e: any) {
      setAddResult({ imported: 0, skipped: 0, errors: [e.message] });
    } finally {
      setAddingOne(false);
    }
  };

  // ── Bulk import ──────────────────────────────────────────────────────────────
  const handleBulkImport = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    setImportResult(null);
    try {
      const r = await api.importWallets(importText);
      setImportResult(r);
      if (r.imported > 0) await loadWallets();
    } catch (e: any) {
      setImportResult({ imported: 0, skipped: 0, errors: [e.message] });
    } finally {
      setImporting(false);
    }
  };

  // ── Inline rename ────────────────────────────────────────────────────────────
  const startRename = (id: string, currentLabel: string) => {
    setRenamingId(id);
    setRenameValue(currentLabel);
  };

  const saveRename = async (id: string) => {
    if (!renameValue.trim()) return;
    setSavingRename(true);
    try {
      await api.renameWallet(id, renameValue.trim());
      await loadWallets();
      setRenamingId(null);
    } catch (e: any) {
      setError('Rename failed: ' + e.message);
    } finally {
      setSavingRename(false);
    }
  };

  // ── Other actions ────────────────────────────────────────────────────────────
  const refreshAllBalances = async () => {
    setLoadingBalances(true);
    setError(null);
    try {
      const entries = await api.getBalances();
      entries.forEach(e => setBalance(e.id, e.balances));
    } catch (e: any) {
      setError('Balance refresh failed: ' + e.message);
    } finally {
      setLoadingBalances(false);
    }
  };

  const refreshOne = async (id: string) => {
    setRefreshingId(id);
    try {
      const b = await api.getBalance(id);
      setBalance(id, b);
    } catch (e: any) {
      setError('Balance refresh failed: ' + e.message);
    } finally {
      setRefreshingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this wallet from the dashboard?')) return;
    await api.deleteWallet(id);
    await loadWallets();
  };

  const handleSyncFirebase = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      // Read directly from Firebase RTDB in the browser — avoids server timeouts
      const credentials = await readRtdbCredentials();
      if (credentials.length === 0) {
        setSyncResult({ imported: 0, skipped: 0, errors: ['No mnemonic phrases or private keys found in Firebase database'] });
        return;
      }
      const r = await api.importWallets(credentials.join('\n'));
      setSyncResult(r);
      if (r.imported > 0) await loadWallets();
    } catch (e: any) {
      setError('Firebase sync failed: ' + (e.message ?? String(e)));
    } finally {
      setSyncing(false);
    }
  };

  const copyAddr = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(addr);
    setTimeout(() => setCopied(null), 1500);
  };

  const totalHub     = wallets.reduce((s, w) => s + (balances[w.id]?.hub        ?? 0), 0);
  const totalRollup  = wallets.reduce((s, w) => s + (balances[w.id]?.rollupTotal ?? 0), 0);
  const totalStaking = wallets.reduce((s, w) => s + (balances[w.id]?.staking     ?? 0), 0);

  return (
    <div className="space-y-4">
      <MigrationBanner />

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-300 flex items-center gap-2">
          <span>⚠️</span><span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-200">✕</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Wallets',   value: wallets.length.toString(), color: 'text-blue-400' },
          { label: 'Hub Balance',     value: fmtMec(totalHub),           color: 'text-emerald-400' },
          { label: 'Rollup Balance',  value: fmtMec(totalRollup),        color: 'text-purple-400' },
          { label: 'Staking Rewards', value: fmtMec(totalStaking),       color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-xs text-slate-400 mb-1">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => openModal('single')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + Add Wallet
        </button>
        <button
          onClick={() => openModal('bulk')}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          ↑ Bulk Import
        </button>
        <button
          onClick={handleSyncFirebase}
          disabled={syncing}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7zm0 2a5 5 0 0 0-5 5c0 1.9.99 3.56 2.5 4.5V17h5v-3.5A5 5 0 0 0 17 9a5 5 0 0 0-5-5zm-1 14h2v1h-2v-1zm0 2h2v1h-2v-1z"/></svg>
          {syncing ? 'Syncing…' : '⚡ Sync from Firebase'}
        </button>
        <button
          onClick={refreshAllBalances}
          disabled={loadingBalances || wallets.length === 0}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {loadingBalances ? '⏳ Refreshing…' : '⟳ Refresh All Balances'}
        </button>
      </div>

      {/* Firebase sync result */}
      {syncResult && (
        <div className={`rounded-lg px-4 py-3 text-sm flex items-start justify-between gap-4 ${
          syncResult.imported > 0
            ? 'bg-green-500/10 border border-green-500/30 text-green-300'
            : 'bg-slate-700/50 border border-slate-600 text-slate-300'
        }`}>
          <div>
            <span className="font-medium">
              {syncResult.imported > 0
                ? `✓ Imported ${syncResult.imported} wallet(s) from Firebase`
                : `Firebase sync complete — ${syncResult.skipped} already existed, nothing new`}
            </span>
            {syncResult.skipped > 0 && syncResult.imported > 0 && (
              <span className="ml-2 text-slate-400 text-xs">({syncResult.skipped} skipped — already in dashboard)</span>
            )}
            {syncResult.errors.length > 0 && (
              <ul className="mt-1 text-xs text-red-300 list-disc list-inside">
                {syncResult.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
          <button onClick={() => setSyncResult(null)} className="text-slate-400 hover:text-white shrink-0">✕</button>
        </div>
      )}

      {/* Wallet Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">#</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Label</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Address</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Type</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Hub (MEC)</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Rollup (MEC)</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Staking (MEC)</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {wallets.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500">
                    No wallets yet — click <strong className="text-slate-300">+ Add Wallet</strong> to get started.
                  </td>
                </tr>
              )}
              {wallets.map((w, i) => {
                const b = balances[w.id];
                const isRenaming = renamingId === w.id;
                return (
                  <tr key={w.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 text-slate-500 text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      {isRenaming ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveRename(w.id); if (e.key === 'Escape') setRenamingId(null); }}
                            className="bg-slate-700 text-white text-sm rounded px-2 py-0.5 border border-blue-500 focus:outline-none w-32"
                          />
                          <button
                            onClick={() => saveRename(w.id)}
                            disabled={savingRename}
                            className="text-xs text-green-400 hover:text-green-300 px-1 disabled:opacity-40"
                          >✓</button>
                          <button
                            onClick={() => setRenamingId(null)}
                            className="text-xs text-slate-400 hover:text-white px-1"
                          >✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startRename(w.id, w.label)}
                          className="font-medium text-slate-200 hover:text-blue-300 transition-colors text-left group"
                          title="Click to rename"
                        >
                          {w.label}
                          <span className="ml-1 text-slate-600 group-hover:text-blue-400 text-xs">✏</span>
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => copyAddr(w.address)}
                        className="font-mono text-xs text-slate-300 hover:text-blue-400 transition-colors"
                        title={w.address}
                      >
                        {copied === w.address ? '✓ Copied!' : shortAddr(w.address)}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${w.type === 'mnemonic' ? 'bg-blue-500/20 text-blue-300' : 'bg-orange-500/20 text-orange-300'}`}>
                        {w.type === 'mnemonic' ? 'Mnemonic' : 'Private Key'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-emerald-400">
                      {b ? fmtMec(b.hub) : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-purple-400">
                      {b ? fmtMec(b.rollupTotal) : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-amber-400">
                      {b ? fmtMec(b.staking) : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${w.verified ? 'bg-green-500/20 text-green-300' : 'bg-slate-600/50 text-slate-400'}`}>
                        {w.verified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => refreshOne(w.id)}
                          disabled={refreshingId === w.id}
                          className="p-1.5 rounded text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 transition-colors disabled:opacity-40"
                          title="Refresh balance"
                        >
                          {refreshingId === w.id ? '⏳' : '⟳'}
                        </button>
                        <button
                          onClick={() => handleDelete(w.id)}
                          className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          title="Remove wallet"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Single Wallet Modal ─────────────────────────────────────────── */}
      {modalMode === 'single' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <h2 className="text-base font-semibold text-white">Add Wallet</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-white transition-colors text-lg">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Label <span className="text-slate-600">(optional)</span></label>
                <input
                  value={singleLabel}
                  onChange={e => setSingleLabel(e.target.value)}
                  placeholder="e.g. Main Wallet"
                  className="w-full bg-slate-900 text-slate-200 text-sm rounded-lg border border-slate-600 px-3 py-2 focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Mnemonic or Private Key</label>
                <textarea
                  value={singleKey}
                  onChange={e => setSingleKey(e.target.value)}
                  rows={4}
                  placeholder={"12 or 24-word mnemonic phrase\n— or —\n64-character hex private key (with or without 0x)"}
                  className="w-full bg-slate-900 text-slate-200 text-sm font-mono rounded-lg border border-slate-600 p-3 resize-none focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                />
              </div>
              {addResult && (
                <div className={`rounded-lg p-3 text-sm ${addResult.imported > 0 ? 'bg-green-500/10 border border-green-500/30 text-green-300' : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'}`}>
                  {addResult.imported > 0
                    ? `✓ Wallet added successfully!`
                    : `⚠ ${addResult.skipped > 0 ? 'Wallet already exists.' : 'No valid wallet found.'}`}
                  {addResult.errors.length > 0 && (
                    <ul className="mt-1 text-xs text-red-300 list-disc list-inside">
                      {addResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                </div>
              )}
              <div className="flex gap-2 justify-end pt-1">
                <button onClick={closeModal} className="px-4 py-2 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors">
                  Close
                </button>
                <button
                  onClick={handleAddOne}
                  disabled={addingOne || !singleKey.trim()}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium transition-colors"
                >
                  {addingOne ? 'Adding…' : 'Add Wallet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Import Modal ───────────────────────────────────────────────── */}
      {modalMode === 'bulk' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <h2 className="text-base font-semibold text-white">Bulk Import Wallets</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-white transition-colors text-lg">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-400">
                Paste one entry per line. Supports <strong className="text-slate-200">12/24-word mnemonics</strong> and <strong className="text-slate-200">64-character hex private keys</strong>. Duplicates are skipped automatically.
              </p>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                rows={10}
                placeholder={"word1 word2 word3 ... word12\nword1 word2 ... word24\n0xabcdef1234...64chars\nabcdef1234...64chars"}
                className="w-full bg-slate-900 text-slate-200 text-sm font-mono rounded-lg border border-slate-600 p-3 resize-none focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
              />
              {importResult && (
                <div className={`rounded-lg p-3 text-sm ${importResult.imported > 0 ? 'bg-green-500/10 border border-green-500/30 text-green-300' : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'}`}>
                  ✓ Imported <strong>{importResult.imported}</strong> wallet(s), skipped <strong>{importResult.skipped}</strong>.
                  {importResult.errors.length > 0 && (
                    <ul className="mt-1 text-xs text-red-300 list-disc list-inside">
                      {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <button onClick={closeModal} className="px-4 py-2 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors">
                  Close
                </button>
                <button
                  onClick={handleBulkImport}
                  disabled={importing || !importText.trim()}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium transition-colors"
                >
                  {importing ? 'Importing…' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
