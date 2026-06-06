/**
 * TypeScript declaration file for the Cosmos utility module
 */

export class Cosmos {
  constructor(chainId: string)

  /**
   * Generate a random mnemonic
   * @param strength 128: 12 words, 256: 24 words
   * @returns Mnemonic string
   */
  getRandomMnemonic(strength?: 128 | 256): string

  /**
   * Set the bech32 prefix
   * @param prefix Prefix such as 'me'
   */
  setBech32MainPrefix(prefix: string): void

  /**
   * Set the derivation path
   * @param value Derivation path such as "m/44'/118'/0'/0/0"
   */
  setPath(value: string): void

  /**
   * Get an address from a mnemonic
   * @param mnemonic Mnemonic
   * @param checkSum Whether to validate the checksum
   * @returns Address
   */
  getAddress(mnemonic: string, checkSum?: boolean): string

  /**
   * Get the private key from a mnemonic
   * @param mnemonic Mnemonic
   * @returns Private key
   */
  getECPairPriv(mnemonic: string): any

  /**
   * Get the public key from a mnemonic
   * @param mnemonic Mnemonic
   * @returns Public key
   */
  getPubKeyAny(mnemonic: string): any

  chainId: string
  path: string
  bech32MainPrefix: string
}
