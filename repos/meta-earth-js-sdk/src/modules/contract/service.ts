/**
 * Contract Module Service
 * Contract module service - Handles all smart contract related operations
 */

import { Logger } from '../../utils/logger'
import { HttpClient } from '../../utils/http-client'
import { ContractApi } from '../../api/contract'
import { WalletService } from '../wallet/service'
import { StoreCodeParams, DeployContractParams, ExecuteContractParams, Layer } from '../../types'

/**
 * Contract Service Class
 * Encapsulates all smart contract related operations
 */
export class ContractService {
  private logger: Logger
  private httpClient: HttpClient
  private api: ContractApi
  private wallet: WalletService
  private ensureInitialized: () => void

  constructor(
    logger: Logger,
    httpClient: HttpClient,
    wallet: WalletService,
    ensureInitialized: () => void,
  ) {
    this.logger = logger
    this.httpClient = httpClient
    this.wallet = wallet
    this.ensureInitialized = ensureInitialized
    this.api = new ContractApi(this.httpClient)
  }

  /**
   * Store smart contract code (WASM only)
   * @param params - Store code parameters (sender, wasmByteCode, etc.)
   * @returns Promise<string> Transaction hash
   */
  public async storeCode(params: StoreCodeParams): Promise<string> {
    this.ensureInitialized()

    try {
      this.logger.info('Storing contract code...', { sender: params.sender })

      const contractLayer = params.layer || 'wasm'

      if (contractLayer === 'evm') {
        throw new Error('EVM contract store code not supported yet')
      }

      // Get signer
      const signer = await this.wallet.createDirectSecp256k1Wallet({
        address: params.sender,
      })

      return await this.api.createStoreCode(params, signer)
    } catch (error: any) {
      this.logger.error('Failed to store contract code:', error)
      throw error
    }
  }

  /**
   * Deploy smart contract (WASM only)
   * @param params - Deployment parameters (codeId, initMsg, label, sender, layer, etc.)
   * @returns Promise<string> Transaction hash
   */
  public async deployContract(params: DeployContractParams): Promise<string> {
    this.ensureInitialized()

    try {
      this.logger.info('Deploying contract...', params)

      // Validate parameters
      if (!params.codeId || !params.initMsg) {
        throw new Error('codeId and initMsg are required')
      }

      const contractLayer = params.layer || 'wasm'

      if (contractLayer === 'evm') {
        throw new Error('EVM contract deployment not supported yet')
      }

      // Get signer
      const signer = await this.wallet.createDirectSecp256k1Wallet({
        address: params.sender,
      })

      return await this.api.createInstantiateContract(params, signer)
    } catch (error: any) {
      this.logger.error('Failed to deploy contract:', error)
      throw error
    }
  }

  /**
   * Execute smart contract (EVM and WASM)
   * Currently only supports WASM contract execution
   * @param params - Execution parameters (contractAddress, msg, sender, layer, etc.)
   * @returns Promise<string> Transaction hash
   */
  public async executeContract(params: ExecuteContractParams): Promise<string> {
    this.ensureInitialized()

    try {
      this.logger.info('Executing contract...', params)

      // Validate parameters
      if (!params.contractAddress || !params.msg || !params.sender) {
        throw new Error('contractAddress, msg, and sender are required')
      }

      const contractLayer = params.layer || 'wasm'

      if (contractLayer === 'evm') {
        throw new Error('EVM contract execution not supported yet')
      }

      // Get signer
      const signer = await this.wallet.createDirectSecp256k1Wallet({
        address: params.sender,
      })

      return await this.api.createExecuteContract(params, signer)
    } catch (error: any) {
      this.logger.error('Failed to execute contract:', error)
      throw error
    }
  }

  /**
   * Get code_id by WASM data hash
   * Query /cosmwasm/wasm/v1/code to find code_id matching the given data_hash
   * @param dataHash - WASM code SHA256 hash (hex string)
   * @param layer - Target layer (default 'hub')
   * @returns Promise<string | null> code_id if found, null otherwise
   */
  public async getCodeIdByHash(dataHash: string, layer: Layer = 'hub'): Promise<string | null> {
    this.ensureInitialized()

    try {
      this.logger.info('Looking up code_id by hash...', { dataHash })
      const codeId = await this.api.getCodeIdByHash(dataHash, layer)

      if (codeId) {
        this.logger.info(`Found code_id: ${codeId} for hash: ${dataHash}`)
      } else {
        this.logger.info(`No code_id found for hash: ${dataHash}`)
      }

      return codeId
    } catch (error: any) {
      this.logger.error('Failed to get code_id by hash:', error)
      throw error
    }
  }

  /**
   * Get contract addresses by Code ID
   * Query /cosmwasm/wasm/v1/code/{code_id}/contracts
   * @param codeId - Code ID
   * @param layer - Target layer (default 'hub')
   * @returns Promise<{ contracts: string[], pagination: any }>
   */
  public async getContractsByCodeId(
    codeId: number,
    layer: Layer = 'hub',
  ): Promise<{ contracts: string[]; pagination: any }> {
    this.ensureInitialized()

    try {
      this.logger.info('Getting contracts by code_id...', { codeId })
      const result = await this.api.getContractsByCodeId(codeId, layer)
      this.logger.info(`Found ${result.contracts?.length || 0} contracts for code_id: ${codeId}`)
      return result
    } catch (error: any) {
      this.logger.error('Failed to get contracts by code_id:', error)
      throw error
    }
  }

  /**
   * Get contract addresses by creator address
   * Query /cosmwasm/wasm/v1/contracts/creator/{creator_address}
   * @param creatorAddress - Creator address
   * @param layer - Target layer (default 'hub')
   * @returns Promise<{ contract_addresses: string[], pagination: any }>
   */
  public async getContractsByCreator(
    creatorAddress: string,
    layer: Layer = 'hub',
  ): Promise<{ contract_addresses: string[]; pagination: any }> {
    this.ensureInitialized()

    try {
      this.logger.info('Getting contracts by creator...', { creatorAddress })
      const result = await this.api.getContractsByCreator(creatorAddress, layer)
      this.logger.info(
        `Found ${result.contract_addresses?.length || 0} contracts for creator: ${creatorAddress}`,
      )
      return result
    } catch (error: any) {
      this.logger.error('Failed to get contracts by creator:', error)
      throw error
    }
  }

  /**
   * Query contract smart state
   * API endpoint: /cosmwasm/wasm/v1/contract/{contractAddress}/smart/{query_data}
   * @param contractAddress - Contract address
   * @param queryData - Query data object (will be base64 encoded automatically)
   * @param layer - Target layer (default 'hub')
   * @returns Promise<{ data: any }> Query result
   */
  public async queryContractSmart(
    contractAddress: string,
    queryData: any,
    layer: Layer = 'hub',
  ): Promise<{ data: any }> {
    this.ensureInitialized()

    try {
      this.logger.info('Querying contract smart...', { contractAddress, queryData })
      const result = await this.api.queryContractSmart(contractAddress, queryData, layer)
      this.logger.info('Query result:', result)
      return result
    } catch (error: any) {
      this.logger.error('Failed to query contract smart:', error)
      throw error
    }
  }
}
