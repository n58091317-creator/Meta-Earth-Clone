/**
 * Transaction Module Service
 * Transaction module service - Handles all transaction related operations
 */

import { Logger } from '../../utils/logger'
import { HttpClient } from '../../utils/http-client'
import { TransactionApi } from '../../api/transaction'
import { TransactionResponse, SimulateRequest, SimulateResponse } from '../../api'
import { TransferParams, Layer } from '../../types'
import { WalletService } from '../wallet/service'

/**
 * Transaction Service Class
 * Encapsulates all transaction related operations
 */
export class TransactionService {
  private logger: Logger
  private httpClient: HttpClient
  private api: TransactionApi
  private walletService: WalletService
  private ensureInitialized: () => void

  constructor(
    logger: Logger,
    httpClient: HttpClient,
    walletService: WalletService,
    ensureInitialized: () => void,
  ) {
    this.logger = logger
    this.httpClient = httpClient
    this.walletService = walletService
    this.ensureInitialized = ensureInitialized
    this.api = new TransactionApi(this.httpClient)
  }

  /**
   * Transfer (HUB layer or Rollup layer)
   * @param params - Transfer parameters (fromAddress, toAddress, amount, denom, layer)
   * @returns Promise<string> Transaction hash
   * @throws Error if required parameters are missing
   */
  public async transfer(params: TransferParams): Promise<string> {
    this.ensureInitialized()

    try {
      this.logger.info('Transferring tokens...', params)

      // Validate parameters
      if (!params.toAddress || !params.fromAddress) {
        throw new Error('toAddress is required')
      }
      if (!params.amount) {
        throw new Error('amount is required')
      }

      // Get signer
      const signer = await this.walletService.createDirectSecp256k1Wallet({
        address: params.fromAddress,
      })

      return await this.api.sendTransfer(params, signer)
    } catch (error: any) {
      this.logger.error('Failed to transfer tokens:', error)
      throw error
    }
  }

  /**
   * Query transaction details by transaction hash (HUB layer or Rollup layer)
   * @param hash - Transaction hash
   * @param layer - Layer (hub or rollup), default is 'hub'
   * @returns Promise<TransactionResponse> Transaction details
   */
  public async getTransaction(hash: string, layer: Layer = 'hub'): Promise<TransactionResponse> {
    this.ensureInitialized()

    try {
      this.logger.info('Getting transaction...', { hash, layer })
      return await this.api.getTransaction(hash, layer)
    } catch (error: any) {
      this.logger.error('Failed to get transaction:', error)
      throw error
    }
  }

  /**
   * Estimate gas fee
   *  /cosmos/tx/v1beta1/simulate
   */
  public async simulateGas(params: SimulateRequest): Promise<SimulateResponse> {
    this.ensureInitialized()

    try {
      this.logger.info('Simulating gas...', params)
      return await this.api.simulateGas(params)
    } catch (error: any) {
      this.logger.error('Failed to simulate gas:', error)
      throw error
    }
  }
}
