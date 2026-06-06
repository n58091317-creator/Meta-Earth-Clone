import { DirectSecp256k1HdWallet, DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { log, logError } from './logger';

const ADDRESS_PREFIX = 'me';

export interface WalletInfo {
  address: string;
  label: string;
  /** Present when wallet was loaded from a mnemonic phrase */
  mnemonic?: string;
  /** Present when wallet was loaded from a raw private key (hex, no 0x) */
  privateKey?: string;
}

// ── Loaders ────────────────────────────────────────────────────────────────

/**
 * Collect all mnemonic phrases from env (MNEMONIC, MNEMONIC_1, MNEMONIC_2, …).
 */
export function loadMnemonicsFromEnv(): string[] {
  const list: string[] = [];
  let i = 1;
  while (process.env[`MNEMONIC_${i}`]) {
    list.push(process.env[`MNEMONIC_${i}`]!.trim());
    i++;
  }
  if (list.length === 0 && process.env.MNEMONIC) {
    list.push(process.env.MNEMONIC.trim());
  }
  return list;
}

/**
 * Collect all private keys from env (PRIVATE_KEY, PRIVATE_KEY_1, PRIVATE_KEY_2, …).
 * Accepts hex strings with or without the 0x prefix.
 */
export function loadPrivateKeysFromEnv(): string[] {
  const list: string[] = [];
  let i = 1;
  while (process.env[`PRIVATE_KEY_${i}`]) {
    list.push(process.env[`PRIVATE_KEY_${i}`]!.trim().replace(/^0x/i, ''));
    i++;
  }
  if (list.length === 0 && process.env.PRIVATE_KEY) {
    list.push(process.env.PRIVATE_KEY.trim().replace(/^0x/i, ''));
  }
  return list;
}

// ── Importers ──────────────────────────────────────────────────────────────

/**
 * Derive wallet addresses from mnemonic phrases (BIP39/BIP44 HD derivation).
 */
export async function importMnemonicWallets(mnemonics: string[]): Promise<WalletInfo[]> {
  const wallets: WalletInfo[] = [];
  for (let i = 0; i < mnemonics.length; i++) {
    const mnemonic = mnemonics[i];
    const label = `Mnemonic Wallet ${mnemonics.length === 1 ? '1' : i + 1}`;
    try {
      const hdWallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: ADDRESS_PREFIX,
      });
      const [account] = await hdWallet.getAccounts();
      wallets.push({ address: account.address, mnemonic, label });
      log(`${label} derived: ${account.address}`);
    } catch (err) {
      logError(`Failed to import ${label}`, err);
    }
  }
  return wallets;
}

/**
 * Derive wallet addresses from raw private keys (secp256k1).
 */
export async function importPrivateKeyWallets(privateKeys: string[]): Promise<WalletInfo[]> {
  const wallets: WalletInfo[] = [];
  for (let i = 0; i < privateKeys.length; i++) {
    const privateKey = privateKeys[i];
    const label = `PK Wallet ${privateKeys.length === 1 ? '1' : i + 1}`;
    try {
      const keyBytes = Buffer.from(privateKey, 'hex');
      const pkWallet = await DirectSecp256k1Wallet.fromKey(
        new Uint8Array(keyBytes),
        ADDRESS_PREFIX
      );
      const [account] = await pkWallet.getAccounts();
      wallets.push({ address: account.address, privateKey, label });
      log(`${label} derived: ${account.address}`);
    } catch (err) {
      logError(`Failed to import ${label}`, err);
    }
  }
  return wallets;
}

/**
 * Load ALL configured wallets (mnemonics + private keys) from environment.
 * Throws if nothing is configured.
 */
export async function loadAllWallets(): Promise<WalletInfo[]> {
  const mnemonics = loadMnemonicsFromEnv();
  const privateKeys = loadPrivateKeysFromEnv();

  if (mnemonics.length === 0 && privateKeys.length === 0) {
    throw new Error(
      'No wallet configured. Set MNEMONIC, MNEMONIC_1, PRIVATE_KEY, or PRIVATE_KEY_1 in Replit Secrets.'
    );
  }

  const fromMnemonics = await importMnemonicWallets(mnemonics);
  const fromKeys = await importPrivateKeyWallets(privateKeys);

  return [...fromMnemonics, ...fromKeys];
}
