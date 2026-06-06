/**
 * Staking Module Service
 * Staking module service - Handles all staking related operations
 */

import { Logger } from '../../utils/logger'
import { HttpClient } from '../../utils/http-client'
import { StakingApi } from '../../api/staking'
import type { FlexibleStakingParams, Layer } from '../../types'
import { WalletService } from '../wallet/service'

/**
 * Staking Service Class
 * Encapsulates all staking related operations
 */
export class StakingService {
  private logger: Logger
  private httpClient: HttpClient
  private api: StakingApi
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
    this.api = new StakingApi(this.httpClient)
  }

  /**
   * Flexible Staking
   * @param params - Staking parameters (address, amount, denom, layer)
   * @returns Promise<string> Transaction hash
   * @throws Error if validator address is missing
   */
  public async stakeFlexible(params: FlexibleStakingParams): Promise<string> {
    this.ensureInitialized()
    try {
      this.logger.info('Staking flexible...', params)
      // Get signer
      const signer = await this.walletService.createDirectSecp256k1Wallet({
        address: params.address,
      })

      return await this.api.createDelegation(params, signer)
    } catch (error: any) {
      this.logger.error('Failed to stake flexible:', error)
      throw error
    }
  }

  /**
   * Claim flexible staking rewards
   * sendMsgWithdrawFixedDeposit
   * @param address - Wallet address
   * @returns Promise<string> Transaction hash
   */
  public async claimStakingReward(address: string): Promise<string> {
    this.ensureInitialized()
    try {
      this.logger.info('Unstaking flexible...', address)

      // Get signer
      const signer = await this.walletService.createDirectSecp256k1Wallet({
        address,
      })

      return await this.api.createWithdrawDelegatorReward(address, 'hub', signer)
    } catch (error: any) {
      this.logger.error('Failed to unstake flexible:', error)
      throw error
    }
  }

  /**
   * Unstake flexible staking
   * @param params - Unstaking parameters (address, amount, layer)
   * @returns Promise<string> Transaction hash
   */
  public async unstakeFlexible(params: FlexibleStakingParams): Promise<string> {
    this.ensureInitialized()
    try {
      this.logger.info('Unstaking flexible...', params)

      // Get signer
      const signer = await this.walletService.createDirectSecp256k1Wallet({
        address: params.address,
      })

      return await this.api.createUndelegation(params.address, params.amount, params.layer, signer)
    } catch (error: any) {
      this.logger.error('Failed to unstake flexible:', error)
      throw error
    }
  }
  /**
   * Query flexible delegation
   * @param delegatorAddr Delegator address
   * @param layer Target layer (default 'hub')
   * @returns Promise<any>
   */
  public async getFlexibleDelegation(delegatorAddr: string, layer: Layer = 'hub'): Promise<any> {
    this.ensureInitialized()
    try {
      this.logger.info('Getting flexible delegation...', delegatorAddr)
      return await this.api.getFlexibleDelegation(delegatorAddr, layer)
    } catch (error: any) {
      this.logger.error('Failed to get flexible delegation:', error)
      throw error
    }
  }

  /**
   * Query flexible delegation rewards
   * @param delegatorAddr Delegator address
   * @param layer Target layer (default 'hub')
   * @returns Promise<any>
   */
  public async getFlexibleDelegationRewards(
    delegatorAddr: string,
    layer: Layer = 'hub',
  ): Promise<any> {
    this.ensureInitialized()
    try {
      this.logger.info('Getting flexible delegation rewards...', delegatorAddr)
      return await this.api.getFlexibleDelegationRewards(delegatorAddr, layer)
    } catch (error: any) {
      this.logger.error('Failed to get flexible delegation rewards:', error)
      throw error
    }
  }
}
