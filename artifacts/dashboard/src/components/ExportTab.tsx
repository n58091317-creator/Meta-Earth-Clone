import { useState, useEffect } from 'react';
import { api } from '../api';
import { useApp } from '../App';
import type { ExportFormat, ExportCategory } from '../types';

export function ExportTab() {
  const { wallets, setWallets } = useApp();
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [category, setCategory] = useState<ExportCategory>('all');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.getWallets().then(setWallets).catch(() => {});
  }, [setWallets]);

  const count = {
    all: wallets.length,
    verified: wallets.filter(w => w.verified).length,
    unverified: wallets.filter(w => !w.verified).length,
  };

  const handleDownload = async () => {
    const exportCount = count[category];
    if (exportCount === 0) return;
    setDownloading(true);
    try {
      const url = api.exportUrl(format, category);
      // Use anchor click to trigger file download
      const a = document.createElement('a');
      a.href = url;
      a.download = `wallets-${category}-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setTimeout(() => setDownloading(false), 1000);
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-5">
        <h2 className="text-sm font-semibold text-white">Export Wallet Data</h2>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-300">
          ⚠️ <strong>Security notice:</strong> Exported files contain private keys and/or mnemonic phrases in plain text. Store them in a secure, encrypted location and never share them.
        </div>

        {/* Format */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">File Format</label>
          <div className="flex gap-2">
            {(['csv', 'json'] as ExportFormat[]).map(f => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  format === f ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {f === 'csv' ? '📊 CSV' : '📋 JSON'}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            {format === 'csv' ? 'Spreadsheet format. Opens in Excel, Google Sheets.' : 'Structured JSON array. Good for programmatic use.'}
          </p>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Filter Category</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: 'all' as ExportCategory, label: '📁 All', desc: `${count.all} wallets` },
              { id: 'verified' as ExportCategory, label: '✅ Verified', desc: `${count.verified} wallets` },
              { id: 'unverified' as ExportCategory, label: '⬜ Unverified', desc: `${count.unverified} wallets` },
            ]).map(c => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`text-center px-3 py-3 rounded-lg border transition-colors ${
                  category === c.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-600 bg-slate-900 hover:border-slate-500'
                }`}
              >
                <p className={`text-sm font-medium ${category === c.id ? 'text-blue-300' : 'text-slate-200'}`}>{c.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{c.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Columns info */}
        <div className="bg-slate-900 rounded-lg p-3">
          <p className="text-xs font-medium text-slate-400 mb-2">Exported fields:</p>
          <div className="flex flex-wrap gap-1">
            {['label', 'address', 'type', 'mnemonic', 'privateKey', 'verified', 'createdAt'].map(col => (
              <span key={col} className="text-xs bg-slate-700 text-slate-300 rounded px-2 py-0.5 font-mono">{col}</span>
            ))}
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={count[category] === 0 || downloading}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {downloading
            ? '⏳ Preparing download…'
            : count[category] === 0
            ? 'No wallets in this category'
            : `📥 Download ${count[category]} wallet${count[category] !== 1 ? 's' : ''} as ${format.toUpperCase()}`}
        </button>
      </div>

      {/* Breakdown */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Wallet Breakdown</h3>
        {wallets.length === 0 ? (
          <p className="text-sm text-slate-500">No wallets imported yet.</p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${(count.verified / wallets.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 shrink-0">
                {count.verified} verified / {count.unverified} unverified
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Wallets become <span className="text-green-400">verified</span> after a successful check-in, transfer, or sweep operation.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {[
                { label: 'Mnemonics', count: wallets.filter(w => w.type === 'mnemonic').length, color: 'text-blue-400' },
                { label: 'Private Keys', count: wallets.filter(w => w.type === 'privatekey').length, color: 'text-orange-400' },
              ].map(row => (
                <div key={row.label} className="bg-slate-900 rounded-lg p-3">
                  <p className="text-xs text-slate-400">{row.label}</p>
                  <p className={`text-lg font-bold mt-0.5 ${row.color}`}>{row.count}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
