import { pool } from './db';
import { performCheckin } from './blockchain';
import { getWallets } from './store';

async function main() {
  const wallets = await getWallets();
  console.log('Wallets found:', wallets.map(w => `${w.label} (${w.address})`).join(', '));

  const wallet2 = wallets.find(w => w.label.toLowerCase().includes('wallet 2') || w.label === '2');
  const target = wallet2 ?? wallets[1] ?? wallets[0];

  if (!target) {
    console.error('No wallets found in DB');
    process.exit(1);
  }

  console.log(`\nRunning check-in for: ${target.label} (${target.address})`);
  const result = await performCheckin(target);
  console.log('\nResult:', JSON.stringify(result, null, 2));
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
