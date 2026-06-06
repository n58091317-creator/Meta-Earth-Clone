/**
 * Wallet Module Service
 * Wallet module service - Handles all wallet related operations
 */

import type { Logger } from '../../utils/logger'
import type { WalletInfo, BalanceInfo, Layer } from '../../types'
import { WalletApi } from '../../api/wallet'
import { instanceME } from '../common'
// import { fromString } from 'uint8arrays'
import { toBech32 } from '@cosmjs/encoding'
import { rawSecp256k1PubkeyToRawAddress } from '@cosmjs/amino'
import { DirectSecp256k1HdWallet, DirectSecp256k1Wallet } from '@cosmjs/proto-signing'
import { PREFIX } from '../../config/define'
import { toString } from 'uint8arrays/to-string'
import bech32 from 'bech32'
import { fromString } from 'uint8arrays'

export type CreateMeWalletParams = {
  /** Account index, default is 0 */
  index?: number
} & (
  | {
      /** Mnemonic */
      mnemonic: string
      /** Private key */
      priv?: never
    }
  | {
      /** Mnemonic */
      mnemonic?: never
      /** Private key (hex string, starts with 0x) */
      priv: string
    }
)

export interface MeWalletAccount {
  /** Wallet address */
  address: string
  /** Mnemonic */
  mnemonic: string
  /** Mnemonic array */
  mnemonicArr: string[]
  /** Private key (string) */
  privateKey: string
  /** Private key (Buffer) */
  privateKeyBuffer: any
  /** Public key (string) */
  pubKeyAnyString: string
  /** Address index */
  index: number
}

/**
 * Create or import ME wallet
 * This is a low-level utility function for generating wallet account information
 * @param params Creation parameters
 * @returns Promise<MeWalletAccount>
 */
export const createMeWallet = async (params: CreateMeWalletParams): Promise<MeWalletAccount> => {
  const index = params.index || 0
  const mnemonic = 'mnemonic' in params ? params.mnemonic : undefined
  const priv = 'priv' in params ? params.priv : undefined

  if (!mnemonic && !priv) {
    throw new Error('Must provide either mnemonic or priv')
  }

  try {
    const cosmosInstance = instanceME(index)
    let privateKey: any

    if (priv) {
      privateKey = Buffer.from(normalizeHexPrivateKey(priv), 'hex')
    } else if (mnemonic) {
      privateKey = cosmosInstance.getECPairPriv(mnemonic)
    } else {
      throw new Error('Unexpected error: mnemonic is missing')
    }
    const pubKeyAny = cosmosInstance.getPubKeyAny(privateKey)
    const address = toBech32(PREFIX, rawSecp256k1PubkeyToRawAddress(pubKeyAny.value))
    const account = {
      address,
      mnemonic: mnemonic || '',
      mnemonicArr: mnemonic ? mnemonic.split(' ') : [],
      privateKey: privateKey ? toString(privateKey, 'base16') : '',
      privateKeyBuffer: privateKey,
      pubKeyAnyString: toString(pubKeyAny.value, 'base16'),
      index,
    }

    return account
  } catch (e) {
    throw new Error(`Wallet creation failed: ${e instanceof Error ? e.message : String(e)}`)
  }
}

export interface WalletServiceConfig {
  logger: Logger
  wallets: Map<string, WalletInfo>
  ensureInitialized: () => void
  api: WalletApi
}

/**
 * Wallet Service Class
 * Encapsulates all wallet related operations
 */
export class WalletService {
  private logger: Logger
  private wallets: Map<string, WalletInfo>
  private ensureInitialized: () => void
  private api: WalletApi

  constructor(config: WalletServiceConfig) {
    this.logger = config.logger
    this.wallets = config.wallets
    this.ensureInitialized = config.ensureInitialized
    this.api = config.api
  }

  /**
   * Generate mnemonic
   * @returns Promise<string>
   */
  public async generateMnemonic(wordLength: number = 12): Promise<string> {
    this.ensureInitialized()

    try {
      this.logger.info('Generating mnemonic...')
      const mnemonic = generateMnemonic(wordLength)
      this.logger.info('Mnemonic generated successfully', { mnemonic })
      return mnemonic
    } catch (error: any) {
      this.logger.error('Failed to generate mnemonic:', error)
      throw error
    }
  }

  /**
   * Create new mnemonic wallet
   * @param mnemonic - Optional: import if provided, otherwise generate new mnemonic
   * @param index - Optional: address index, default is 0
   * @returns Promise<{ mnemonic: string; address: string; privKeyString: string; index: number }>
   */
  public async createMnemonicWallet(
    mnemonic?: string,
    index: number = 0,
  ): Promise<{ mnemonic: string; address: string; privateKey: string; index: number }> {
    this.ensureInitialized()

    try {
      this.logger.info('Creating mnemonic wallet...')

      const mnemonicToUse = mnemonic || (await this.generateMnemonic())
      const walletAccount = await createMeWallet({ mnemonic: mnemonicToUse, index })

      this.wallets.set(walletAccount.address, walletAccount)

      this.logger.info('Wallet created successfully', {
        address: walletAccount.address,
        mnemonic: walletAccount.mnemonic,
        privateKey: walletAccount.privateKey,
      })

      return walletAccount
    } catch (error: any) {
      this.logger.error('Failed to create mnemonic wallet:', error)
      throw error
    }
  }

  /**
   * Batch create/import wallets
   * @param mnemonic - Mnemonic
   * @param count - Count to create
   * @param startIndex - Start index, default is 0
   * @returns Promise<Array<{ address: string; index: number; privateKey: string }>>
   */
  public async batchCreateWallets(
    mnemonic: string,
    count: number,
    startIndex: number = 0,
  ): Promise<Array<{ address: string; index: number; privateKey: string; mnemonic: string }>> {
    this.ensureInitialized()
    try {
      this.logger.info(`Batch creating ${count} wallets starting from index ${startIndex}...`)
      const wallets: Array<{
        address: string
        index: number
        privateKey: string
        mnemonic: string
      }> = []

      for (let i = 0; i < count; i++) {
        const index = startIndex + i
        const result = await this.createMnemonicWallet(mnemonic, index)
        wallets.push({
          mnemonic: result.mnemonic,
          address: result.address,
          index: result.index,
          privateKey: result.privateKey,
        })
      }

      return wallets
    } catch (error: any) {
      this.logger.error('Failed to batch create wallets:', error)
      throw error
    }
  }

  /**
   * Add new account (generate new address based on existing mnemonic)
   * @param mnemonic - Mnemonic
   * @param index - Address index
   * @returns Promise<{ address: string; index: number }>
   */
  public async addAccount(
    mnemonic: string,
    index: number,
  ): Promise<{ address: string; index: number }> {
    this.ensureInitialized()
    try {
      this.logger.info(`Adding account with index ${index}...`)
      const result = await this.createMnemonicWallet(mnemonic, index)
      return {
        address: result.address,
        index: result.index,
      }
    } catch (error: any) {
      this.logger.error('Failed to add account:', error)
      throw error
    }
  }

  /**
   * Create/Import wallet via private key
   * @param privateKey - Private key string (without 0x prefix)
   * @returns Promise<{ address: string }>
   */
  public async createPrivateKeyWallet(privateKey: string): Promise<{ address: string }> {
    this.ensureInitialized()

    try {
      this.logger.info('Creating private key wallet...')
      const walletAccount = await createMeWallet({ priv: normalizeHexPrivateKey(privateKey) })

      this.wallets.set(walletAccount.address, walletAccount)

      this.logger.info('Private key wallet created successfully', {
        address: walletAccount.address,
      })

      return walletAccount
    } catch (error: any) {
      this.logger.error('Failed to create private key wallet:', error)
      throw error
    }
  }

  /**
   * Import wallet (supports mnemonic or private key)
   * @param data - Object containing mnemonic or privateKey
   * @returns Promise<{ address: string }>
   * @throws Error if neither mnemonic nor privateKey is provided
   */
  public async importWallet(data: {
    mnemonic?: string
    privateKey?: string
    index?: number
  }): Promise<{ address: string }> {
    this.ensureInitialized()

    try {
      this.logger.info('Importing wallet...', { hasMnemonic: !!data.mnemonic })

      if (!data.mnemonic && !data.privateKey) {
        throw new Error('Either mnemonic or privateKey must be provided')
      }

      let walletAccount
      if (data.mnemonic) {
        walletAccount = await this.createMnemonicWallet(data.mnemonic, data.index || 0)
      } else if (data.privateKey) {
        walletAccount = await this.createPrivateKeyWallet(data.privateKey)
      } else {
        throw new Error('Invalid wallet data')
      }

      this.logger.info('Wallet imported successfully', { address: walletAccount.address })
      return walletAccount
    } catch (error: any) {
      this.logger.error('Failed to import wallet:', error)
      throw error
    }
  }

  /**
   * Export wallet information
   * @param address - Wallet address
   * @returns Promise<{ mnemonic?: string; privateKey?: string }>
   * @throws Error if wallet not found
   */
  public async exportWallet(
    address: string,
  ): Promise<{ mnemonic?: string; privateKey?: string; address: string; index?: number }> {
    this.ensureInitialized()

    try {
      this.logger.info('Exporting wallet...', { address })

      const wallet = this.wallets.get(address)
      if (!wallet) {
        throw new Error('Wallet not found')
      }

      return {
        mnemonic: wallet.mnemonic,
        privateKey: wallet.privateKey,
        address,
        index: wallet.index,
      }
    } catch (error: any) {
      this.logger.error('Failed to export wallet:', error)
      throw error
    }
  }

  /**
   * Convert 0x format address to ME (Bech32) address
   * @param address - 0x format address
   * @returns ME format address
   */
  public convert0xToMeAddress(address: string): string {
    this.logger.info('Converting 0x address to ME address...')
    try {
      return hexToCosmosAddress(address)
    } catch (error: any) {
      this.logger.error('Failed to convert address:', error)
      throw error
    }
  }

  /**
   * Convert ME (Bech32) address to 0x format address
   * @param address - ME format address
   * @returns 0x format address
   */
  public convertMeTo0xAddress(address: string): string {
    this.logger.info('Converting ME address to 0x address...')
    try {
      return cosmosAddressToHex(address)
    } catch (error: any) {
      this.logger.error('Failed to convert address:', error)
      throw error
    }
  }

  /**
   * Get list of all managed wallet addresses
   * @returns string[] Address list
   */
  public getWalletAddresses(): string[] {
    this.ensureInitialized()
    this.logger.info('Getting wallet addresses...')
    return Array.from(this.wallets.keys())
  }

  /**
   * Get balance of specified address
   * @param address Target address
   * @param layer Target layer (default 'hub')
   * @returns Promise<BalanceInfo[]>
   */
  public async getBalance(address: string, layer: Layer = 'hub'): Promise<BalanceInfo[]> {
    this.ensureInitialized()
    try {
      this.logger.info('Getting balance...', { address, layer })
      return await this.api.getBalance(address, layer)
    } catch (error: any) {
      this.logger.error('Failed to get balance:', error)
      throw error
    }
  }

  /**
   * Create DirectSecp256k1Wallet
   * @param address - Address
   * @param privateKey - Private key
   * @param mnemonic - Mnemonic
   * @returns DirectSecp256k1Wallet | DirectSecp256k1HdWallet
   */
  public async createDirectSecp256k1Wallet({
    address,
    privateKey,
    mnemonic,
  }: {
    address?: string
    privateKey?: string
    mnemonic?: string
  }): Promise<DirectSecp256k1Wallet | DirectSecp256k1HdWallet> {
    this.ensureInitialized()
    try {
      this.logger.info('Creating DirectSecp256k1 wallet...')

      // 1. Try to get from cache
      if (address) {
        const walletAccount = this.wallets.get(address)
        if (walletAccount?.privateKeyBuffer) {
          return DirectSecp256k1Wallet.fromKey(
            new Uint8Array(walletAccount.privateKeyBuffer),
            PREFIX,
          )
        }
        if (walletAccount?.privateKey) {
          const privKeyBuffer = Buffer.from(fromString(walletAccount.privateKey, 'base16'))
          return DirectSecp256k1Wallet.fromKey(new Uint8Array(privKeyBuffer), PREFIX)
        }
        if (walletAccount?.mnemonic) {
          return DirectSecp256k1HdWallet.fromMnemonic(walletAccount.mnemonic, { prefix: PREFIX })
        }
      }

      // 2. Try to use private key
      if (privateKey) {
        const privKeyBuffer = Buffer.from(fromString(normalizeHexPrivateKey(privateKey), 'base16'))
        return DirectSecp256k1Wallet.fromKey(new Uint8Array(privKeyBuffer), PREFIX)
      }

      // 3. Try to use mnemonic
      if (mnemonic) {
        return DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: PREFIX })
      }

      throw new Error('The account has no mnemonics and no private key')
    } catch (error: any) {
      this.logger.error('Failed to create DirectSecp256k1 wallet:', error)
      throw error
    }
  }
  /**
   * Get node version info (RPC)
   * @param layer Target layer (default 'hub')
   * @returns Promise<any>
   */
  public async getNodeVersion(layer: Layer = 'hub'): Promise<any> {
    this.ensureInitialized()

    try {
      this.logger.info('Getting node version...', { layer })
      return await this.api.getNodeVersion(layer)
    } catch (error: any) {
      this.logger.error('Failed to get node version:', error)
      throw error
    }
  }

  /**
   * Get network status info (RPC)
   * @param layer Target layer (default 'hub')
   * @returns Promise<any>
   */
  public async getNetworkStatus(layer: Layer = 'hub'): Promise<any> {
    this.ensureInitialized()

    try {
      this.logger.info('Getting network status...', { layer })
      return await this.api.getNetworkStatus(layer)
    } catch (error: any) {
      this.logger.error('Failed to get network status:', error)
      throw error
    }
  }
}

/**
 * Convert Cosmos bech32 address to 0x format hex address
 * @param cosmosAddress - Cosmos bech32 format address (e.g. me139mq752delxv78jvtmwxhasyrycufsvr0mue6u)
 * @returns 0x format address (e.g. 0x...)
 */
export function cosmosAddressToHex(cosmosAddress: string): string {
  try {
    // Decode bech32 address
    const decoded = bech32.decode(cosmosAddress)

    // Convert words (5-bit) to bytes (8-bit)
    const bytes = bech32.fromWords(decoded.words)

    // Convert to hex string
    const hex = Buffer.from(bytes).toString('hex')

    return '0x' + hex
  } catch (error) {
    throw new Error(`Invalid Cosmos address: ${cosmosAddress}. Error: ${error}`)
  }
}

/**
 * Convert 0x format address back to Cosmos bech32 address
 * @param hexAddress - 0x format address
 * @param prefix - bech32 prefix (e.g. 'me', 'metaearth', 'cosmos')
 * @returns Cosmos bech32 format address
 */
export function hexToCosmosAddress(hexAddress: string, prefix: string = 'me'): string {
  try {
    // Remove '0x' prefix
    const hex = hexAddress.replace(/^0x/, '')

    if (!hex || hex.length === 0) {
      throw new Error('Empty hex address')
    }

    // Ensure even length
    const normalizedHex = hex.length % 2 !== 0 ? '0' + hex : hex

    // Convert to bytes
    const bytes = Buffer.from(normalizedHex, 'hex')

    if (bytes.length === 0) {
      throw new Error('Invalid hex address: results in empty bytes')
    }

    // Convert to 5-bit words
    const words = bech32.toWords(bytes)

    // Encode to bech32
    const cosmosAddress = bech32.encode(prefix, words)

    return cosmosAddress
  } catch (error) {
    throw new Error(`Invalid hex address: ${hexAddress}. Error: ${error}`)
  }
}

function normalizeHexPrivateKey(privateKey: string): string {
  const normalized = privateKey.trim().replace(/^0x/i, '')

  if (!normalized) {
    throw new Error('Private key is empty')
  }

  return normalized
}

/**
 * Generate random mnemonic
 * @param wordLength 12 | 24
 * @returns Mnemonic string
 */
export const generateMnemonic = (wordLength: number = 12) => {
  const me = instanceME(0)
  const strength = wordLength === 12 ? 128 : 256
  const _mnemonic: string = me.getRandomMnemonic(strength) ?? ``
  return _mnemonic
}
