/**
 * Staking API Methods
 * Staking related API interface methods
 */

import { HttpClient } from '../utils/http-client'
import type { Layer, Coin, FlexibleStakingParams } from '../types'
import { txClient as stakingClient } from '../me-client-ts/cosmos.staking.v1beta1/module'
import { txClient as wstakingClient } from '../me-client-ts/metaearth.wstaking/module'
import { PREFIX } from '../config/define'
import { OfflineSigner } from '@cosmjs/proto-signing'
import { TransactionApi } from './transaction'

export class StakingApi {
  constructor(private httpClient: HttpClient) {}
  /**
   * Create delegation transaction
   * @param params Delegation parameters
   * @param signer Signer
   * @returns Promise<string> Transaction hash
   */
  public async createDelegation(
    params: FlexibleStakingParams,
    signer: OfflineSigner,
  ): Promise<string> {
    try {
      const { layer = 'hub', amount } = params
      const [account] = await signer.getAccounts()
      const client = stakingClient({ signer, prefix: PREFIX })

      const value: any = {
        delegatorAddress: account.address,
        amount,
      }
      const { tx_bytes } = await client.sendMsgDelegate({
        value,
      })
      const response = await new TransactionApi(this.httpClient).sendTransaction(tx_bytes, layer)

      return response.tx_response.txhash
    } catch (error) {
      console.error('Failed to create delegation:', error)
      throw error
    }
  }

  /**
   * Create undelegation transaction
   * @param delegatorAddress Delegator address
   * @param validatorAddress Validator address
   * @param amount Undelegation amount
   * @param layer Target layer
   * @param signer Signer
   * @returns Promise<string> Transaction hash
   */
  public async createUndelegation(
    delegatorAddress: string,
    amount: Coin,
    layer: Layer = 'hub',
    signer: OfflineSigner,
  ): Promise<string> {
    try {
      const client = stakingClient({ signer, prefix: PREFIX })

      const value: any = {
        delegatorAddress,
        amount,
      }
      const { tx_bytes } = await client.sendMsgUndelegate({
        value,
      })
      const response = await new TransactionApi(this.httpClient).sendTransaction(tx_bytes, layer)

      return response.tx_response.txhash
    } catch (error) {
      console.error('Failed to create undelegation:', error)
      throw error
    }
  }

  /**
   * Withdraw delegator reward
   */
  public async createWithdrawDelegatorReward(
    delegatorAddress: string,
    layer: Layer = 'hub',
    signer: OfflineSigner,
  ): Promise<string> {
    try {
      const client = wstakingClient({ signer, prefix: PREFIX })

      const value: any = {
        delegatorAddress,
      }
      const { tx_bytes } = await client.sendMsgWithdrawDelegatorReward({
        value,
      })
      const response = await new TransactionApi(this.httpClient).sendTransaction(tx_bytes, layer)

      return response.tx_response.txhash
    } catch (error) {
      console.error('Failed to withdraw delegator reward:', error)
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
    try {
      const response = await this.httpClient.get(
        `/metaearth/wstaking/delegation/${delegatorAddr}`,
        {
          params: {},
          layer,
        },
      )
      return response.data
    } catch (error) {
      console.error('Failed to get flexible delegation:', error)
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
    try {
      const response = await this.httpClient.get(
        `/metaearth/wstaking/delegation-rewards/${delegatorAddr}`,
        {
          params: {},
          layer,
        },
      )
      return response.data
    } catch (error) {
      console.error('Failed to get flexible delegation rewards:', error)
      throw error
    }
  }
}
