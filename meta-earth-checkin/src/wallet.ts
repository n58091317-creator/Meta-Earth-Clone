import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { log, logError } from './logger';

/**
 * Meta Earth uses the 'me' bech32 prefix (from the SDK source).
 */
const ADDRESS_PREFIX = 'me';

export interface WalletInfo {
  address: string;
  mnemonic: string;
  label: string;
}

/**
 * Read mnemonics from environment variables.
 * Supports MNEMONIC, or MNEMONIC_1 / MNEMONIC_2 / ... for multiple wallets.
 */
export function loadMnemonicsFromEnv(): string[] {
  const mnemonics: string[] = [];

  let index = 1;
  while (true) {
    const mnemonic = process.env[`MNEMONIC_${index}`];
    if (!mnemonic) break;
    mnemonics.push(mnemonic.trim());
    index++;
  }

  if (mnemonics.length === 0 && process.env.MNEMONIC) {
    mnemonics.push(process.env.MNEMONIC.trim());
  }

  if (mnemonics.length === 0) {
    throw new Error(
      'No mnemonic found. Set MNEMONIC or MNEMONIC_1 in Replit Secrets.'
    );
  }

  return mnemonics;
}

/**
 * Derive wallet info (address) from a mnemonic using the cosmjs HD wallet.
 * Uses the same derivation the Meta Earth SDK uses internally.
 */
export async function importWallets(mnemonics: string[]): Promise<WalletInfo[]> {
  const wallets: WalletInfo[] = [];

  for (let i = 0; i < mnemonics.length; i++) {
    const mnemonic = mnemonics[i];
    const label = mnemonics.length === 1 ? 'Wallet 1' : `Wallet ${i + 1}`;
    try {
      const hdWallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: ADDRESS_PREFIX,
      });
      const accounts = await hdWallet.getAccounts();
      wallets.push({
        address: accounts[0].address,
        mnemonic,
        label,
      });
      log(`${label} derived: ${accounts[0].address}`);
    } catch (err) {
      logError(`Failed to import ${label}`, err);
    }
  }

  return wallets;
}
