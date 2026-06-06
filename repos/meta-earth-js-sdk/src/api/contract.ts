/**
 * Contract API Methods
 * Contract related API interface methods
 */

import { HttpClient } from '../utils/http-client'
import type { Layer } from '../types'
import {
  MsgInstantiateContract,
  txClient as wasmClient,
} from '../me-client-ts/cosmwasm.wasm.v1/module'
import { PREFIX } from '../config/define'
import { OfflineSigner } from '@cosmjs/proto-signing'
import { TransactionApi } from './transaction'
import { StoreCodeParams, DeployContractParams, ExecuteContractParams } from '../types'
import { toUtf8, fromBase64 } from '@cosmjs/encoding'

export class ContractApi {
  constructor(private httpClient: HttpClient) {}

  /**
   * Create store code transaction
   * @param params Store code parameters
   * @param signer Signer
   * @returns Promise<string> Transaction hash
   */
  public async createStoreCode(params: StoreCodeParams, signer: OfflineSigner): Promise<string> {
    try {
      const { networkLayer = 'hub' } = params
      const client = wasmClient({ signer, prefix: PREFIX })

      let wasmByteCode: Uint8Array
      if (typeof params.wasmByteCode === 'string') {
        wasmByteCode = fromBase64(params.wasmByteCode)
      } else {
        wasmByteCode = params.wasmByteCode
      }

      const value = {
        sender: params.sender,
        wasmByteCode: wasmByteCode,
        instantiatePermission: params.instantiatePermission,
      }

      const { tx_bytes } = await client.sendMsgStoreCode({
        value,
      })

      const response = await new TransactionApi(this.httpClient).sendTransaction(
        tx_bytes,
        networkLayer,
      )

      return response.tx_response.txhash
    } catch (error) {
      console.error('Failed to create store code transaction:', error)
      throw error
    }
  }

  /**
   * Create instantiate contract transaction
   * @param params Deployment parameters
   * @param signer Signer
   * @returns Promise<string> Transaction hash
   */
  public async createInstantiateContract(
    params: DeployContractParams,
    signer: OfflineSigner,
  ): Promise<string> {
    try {
      const { networkLayer = 'hub' } = params
      const [account] = await signer.getAccounts()
      const client = wasmClient({ signer, prefix: PREFIX })
      const msgBytes = toUtf8(JSON.stringify(params.initMsg))

      const value: MsgInstantiateContract = {
        sender: account.address,
        admin: params.admin || '',
        codeId: params.codeId,
        label: params.label,
        msg: msgBytes,
        funds: params.funds || [],
      }

      const { tx_bytes } = await client.sendMsgInstantiateContract({
        value,
      })

      const response = await new TransactionApi(this.httpClient).sendTransaction(
        tx_bytes,
        networkLayer,
      )

      // Note: This returns the tx hash. To get the contract address, one would need to query the tx events or use a websocket listener.
      return response.tx_response.txhash
    } catch (error) {
      console.error('Failed to create instantiate contract transaction:', error)
      throw error
    }
  }

  /**
   * Create execute contract transaction
   * @param params Execution parameters
   * @param signer Signer
   * @returns Promise<string> Transaction hash
   */
  public async createExecuteContract(
    params: ExecuteContractParams,
    signer: OfflineSigner,
  ): Promise<string> {
    try {
      const { networkLayer = 'hub' } = params
      const client = wasmClient({ signer, prefix: PREFIX })

      const msgBytes = toUtf8(JSON.stringify(params.msg))

      const value = {
        sender: params.sender,
        contract: params.contractAddress,
        msg: msgBytes,
        funds: params.funds || [],
      }

      const { tx_bytes } = await client.sendMsgExecuteContract({
        value,
      })

      const response = await new TransactionApi(this.httpClient).sendTransaction(
        tx_bytes,
        networkLayer,
      )

      return response.tx_response.txhash
    } catch (error) {
      console.error('Failed to create execute contract transaction:', error)
      throw error
    }
  }

  /**
   * Get code_id by data_hash from /cosmwasm/wasm/v1/code
   * @param dataHash WASM code SHA256 hash (uppercase hex string)
   * @param layer Target layer (default 'hub')
   * @returns Promise<string | null> code_id if found, null otherwise
   */
  public async getCodeIdByHash(dataHash: string, layer: Layer = 'hub'): Promise<string | null> {
    try {
      // Convert hash to uppercase for matching
      const hashUpperCase = dataHash.toUpperCase()

      const response = await this.httpClient.get('/cosmwasm/wasm/v1/code', {
        params: {},
        layer,
      })

      const data = response.data as {
        code_infos: Array<{
          code_id: string
          creator: string
          data_hash: string
          instantiate_permission: {
            permission: string
            addresses: string[]
          }
        }>
        pagination: {
          next_key: string | null
          total: string
        }
      }

      // Find matching data_hash in code_infos
      const matched = data.code_infos.find((info) => info.data_hash === hashUpperCase)

      return matched ? matched.code_id : null
    } catch (error) {
      console.error('Failed to get code_id by hash:', error)
      throw error
    }
  }

  /**
   * Get contract addresses by Code ID
   * API endpoint: /cosmwasm/wasm/v1/code/{code_id}/contracts
   * @param codeId Code ID
   * @param layer Target layer (default 'hub')
   * @returns Promise<{ contracts: string[], pagination: any }>
   */
  public async getContractsByCodeId(
    codeId: number,
    layer: Layer = 'hub',
  ): Promise<{ contracts: string[]; pagination: any }> {
    try {
      const response = await this.httpClient.get(`/cosmwasm/wasm/v1/code/${codeId}/contracts`, {
        params: {},
        layer,
      })

      return response.data as { contracts: string[]; pagination: any }
    } catch (error) {
      console.error('Failed to get contracts by code_id:', error)
      throw error
    }
  }

  /**
   * Get contract addresses by creator address
   * API endpoint: /cosmwasm/wasm/v1/contracts/creator/{creator_address}
   * @param creatorAddress Creator address
   * @param layer Target layer (default 'hub')
   * @returns Promise<{ contract_addresses: string[], pagination: any }>
   */
  public async getContractsByCreator(
    creatorAddress: string,
    layer: Layer = 'hub',
  ): Promise<{ contract_addresses: string[]; pagination: any }> {
    try {
      const response = await this.httpClient.get(
        `/cosmwasm/wasm/v1/contracts/creator/${creatorAddress}`,
        {
          params: {},
          layer,
        },
      )

      return response.data as { contract_addresses: string[]; pagination: any }
    } catch (error) {
      console.error('Failed to get contracts by creator:', error)
      throw error
    }
  }

  /**
   * Query contract smart state
   * API endpoint: /cosmwasm/wasm/v1/contract/{contractAddress}/smart/{query_data}
   * @param contractAddress Contract address
   * @param queryData Query data object (will be base64 encoded)
   * @param layer Target layer (default 'hub')
   * @returns Promise<{ data: any }> Query result
   */
  public async queryContractSmart(
    contractAddress: string,
    queryData: any,
    layer: Layer = 'hub',
  ): Promise<{ data: any }> {
    try {
      // Convert query data to JSON string, then base64 encode
      const queryJson = JSON.stringify(queryData)
      const queryBase64 = Buffer.from(queryJson).toString('base64')

      const response = await this.httpClient.get(
        `/cosmwasm/wasm/v1/contract/${contractAddress}/smart/${queryBase64}`,
        {
          params: {},
          layer,
        },
      )

      return response.data as { data: any }
    } catch (error) {
      console.error('Failed to query contract smart:', error)
      throw error
    }
  }
}
