/**
 * Wallet related type definitions
 */

/**
 * Wallet information
 */
export interface WalletInfo {
  mnemonic?: string
  privateKey?: string
  address?: string
}

/**
 * Create mnemonic wallet parameters
 */
export interface CreateMnemonicWalletParams {
  mnemonic?: string
}

/**
 * Import wallet parameters
 */
export interface ImportWalletParams {
  mnemonic?: string
  privateKey?: string
}

/**
 * Export wallet result
 */
export interface ExportWalletResult {
  mnemonic?: string
  privateKey?: string
}
