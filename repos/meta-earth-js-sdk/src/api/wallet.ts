/**
 * Wallet API Methods
 * Wallet related API interface methods
 */

import { HttpClient } from '../utils/http-client'
import type { BalanceInfo, Layer } from '../types'

export class WalletApi {
  constructor(private httpClient: HttpClient) {}

  /**
   * Get balance of specified address
   * @param address Target address
   * @param layer Target layer (default 'hub')
   * @returns Promise<BalanceInfo[]>
   */
  public async getBalance(address: string, layer: Layer = 'hub'): Promise<BalanceInfo[]> {
    try {
      const response = await this.httpClient.get(`/cosmos/bank/v1beta1/balances/${address}`, {
        layer,
      })

      return response.data.balances as BalanceInfo[]
    } catch (error) {
      console.error('Failed to get balance:', error)
      throw error
    }
  }

  /**
   * Query account details (sequence, public key, etc.)
   * @param address Target address
   * @param layer Target layer (default 'hub')
   * @returns Promise<any>
   */
  public async getAccountInfo(address: string, layer: Layer = 'hub'): Promise<any> {
    try {
      const response = await this.httpClient.get(`/cosmos/auth/v1beta1/accounts/${address}`, {
        layer,
      })

      return response.data
    } catch (error) {
      console.error('Failed to get account:', error)
      throw error
    }
  }

  /**
   * Get node info
   * /cosmos/base/tendermint/v1beta1/node_info
   * @param layer Target layer (default 'hub')
   * @returns Promise<any>
   */
  public async getNodeInfo(layer: Layer = 'hub'): Promise<any> {
    try {
      const response = await this.httpClient.get(`/cosmos/base/tendermint/v1beta1/node_info`, {
        layer,
      })

      return response.data
    } catch (error) {
      console.error('Failed to get node info:', error)
      throw error
    }
  }
  /**
   * Get node version info (RPC)
   * /abci_info
   * @param layer Target layer (default 'hub')
   * @returns Promise<any>
   */
  public async getNodeVersion(layer: Layer = 'hub'): Promise<any> {
    try {
      const response = await this.httpClient.get('/abci_info', {
        layer,
        urlType: 'rpc',
      })

      return response.data
    } catch (error) {
      console.error('Failed to get node version:', error)
      throw error
    }
  }

  /**
   * Get network status info (RPC)
   * /status
   * @param layer Target layer (default 'hub')
   * @returns Promise<any>
   */
  public async getNetworkStatus(layer: Layer = 'hub'): Promise<any> {
    try {
      const response = await this.httpClient.get('/status', {
        layer,
        urlType: 'rpc',
      })

      return response.data
    } catch (error) {
      console.error('Failed to get network status:', error)
      throw error
    }
  }
}
