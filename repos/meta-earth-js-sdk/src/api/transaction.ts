/**
 * Transaction API Methods
 * Transaction related API interface methods
 */

import { HttpClient } from '../utils/http-client'
import type { TransferParams, Layer } from '../types'
import type {
  TransactionResponse,
  NetworkFees,
  PaginatedResponse,
  SimulateRequest,
  SimulateResponse,
  SendTransactionResponse,
} from './types'
import { txClient as bankClient } from '../me-client-ts/cosmos.bank.v1beta1/module'
import { PREFIX, gas_max_set } from '../config/define'
import { OfflineSigner } from '@cosmjs/proto-signing'

export class TransactionApi {
  constructor(private httpClient: HttpClient) {}

  /**
   * Send transfer transaction
   * @param params Transfer parameters (including fromAddress, toAddress, amount, denom, etc.)
   * @param signer Signer
   * @returns Promise<string> Transaction hash
   */
  public async sendTransfer(params: TransferParams, signer: OfflineSigner): Promise<string> {
    try {
      const { layer = 'hub', ...data } = params
      const [account] = await signer.getAccounts()
      const client = bankClient({ signer, prefix: PREFIX })
      const value: any = {
        fromAddress: account.address,
        toAddress: data.toAddress,
        amount: data.amount,
      }
      const { tx_bytes } = await client.sendMsgSend({ value, memo: data.memo, gas: gas_max_set })
      const response = await this.sendTransaction(tx_bytes, layer)
      // Return transaction hash
      return response.tx_response.txhash
    } catch (error) {
      console.error('Failed to send transfer:', error)
      throw error
    }
  }

  /**
   * Query transaction details by transaction hash
   * @param hash - Transaction hash
   * @param layer - Layer (hub or rollapp), default is 'hub'
   * @returns Promise<TransactionResponse>
   */
  public async getTransaction(hash: string, layer: Layer = 'hub'): Promise<TransactionResponse> {
    try {
      const response = await this.httpClient.get(`/cosmos/tx/v1beta1/txs/${hash}`, {
        params: {},
        layer,
      })

      return response.data as TransactionResponse
    } catch (error) {
      console.error('Failed to get transaction:', error)
      throw error
    }
  }

  /**
   * Get transaction history list for specified address
   * @param address Target address
   * @param limit Quantity per page (default 10)
   * @param offset Offset (default 0)
   * @param layer Target layer (default 'hub')
   * @returns Promise<PaginatedResponse<any>>
   */
  public async getTransactions(
    address: string,
    limit: number = 10,
    offset: number = 0,
    layer: Layer = 'hub',
  ): Promise<PaginatedResponse<any>> {
    try {
      const response = await this.httpClient.get(`/api/v1/transactions/${address}`, {
        params: { limit, offset },
        layer,
      })

      return response.data as PaginatedResponse<any>
    } catch (error) {
      console.error('Failed to get transactions:', error)
      throw error
    }
  }

  /**
   * Get current network fee information
   * @param layer Target layer (default 'hub')
   * @returns Promise<NetworkFees>
   */
  public async getNetworkFees(layer: Layer = 'hub'): Promise<NetworkFees> {
    try {
      const response = await this.httpClient.get('/api/v1/network/fees', {
        params: {},
        layer,
      })

      return response.data as NetworkFees
    } catch (error) {
      console.error('Failed to get network fees:', error)
      throw error
    }
  }

  /**
   * Estimate gas fee
   * @param params - Estimation parameters SimulateRequest
   * @returns Promise<SimulateResponse>
   */
  public async simulateGas(params: SimulateRequest): Promise<SimulateResponse> {
    try {
      const response = await this.httpClient.post<SimulateResponse>(
        '/cosmos/tx/v1beta1/simulate',
        params,
      )

      return response.data
    } catch (error) {
      console.error('Failed to simulateGas gas:', error)
      throw error
    }
  }

  /**
   * /cosmos/tx/v1beta1/txs
   * Send transaction
   * @param txBytesBase64 - Transaction bytes
   * @returns Promise<SendTransactionResponse>
   */
  public async sendTransaction(
    txBytesBase64: string,
    layer: Layer = 'hub',
  ): Promise<SendTransactionResponse> {
    try {
      const response = await this.httpClient.post<SendTransactionResponse>(
        '/cosmos/tx/v1beta1/txs',
        {
          tx_bytes: txBytesBase64,
          mode: 'BROADCAST_MODE_SYNC',
        },
        {
          layer,
          urlType: 'rest',
        },
      )

      return response.data
    } catch (error) {
      console.error('Failed to send transaction:', error)
      throw error
    }
  }
}
