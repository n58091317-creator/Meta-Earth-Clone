import type { SDKConfig, SDKOptions, Environment, Network } from './types'
import { Logger } from './utils/logger'
import { detectEnvironment } from './utils/environment'
import { getNetworkConfig, type INetwork } from './config/define'
import { createHttpClientWithNetwork, type HttpClient } from './utils/http-client'
import { WalletApi } from './api/wallet'

// Import Service Modules
import { WalletService } from './modules/wallet/service'
import { TransactionService } from './modules/transaction/service'
import { StakingService } from './modules/staking/service'
import { GovernanceService } from './modules/governance/service'
import { ContractService } from './modules/contract/service'

const DEFAULT_CONFIG: SDKConfig = {
  timeout: 60000,
  debug: false,
  network: 'testnet',
  layer: 'hub',
}

const SDK_VERSION = '1.0.0'

/**
 * Meta Earth JS SDK Main Class
 * Supports wallet management, transfer, staking, governance, and contract operations on Meta Earth blockchain
 */
export class MetaEarthSDK {
  private config: SDKConfig
  private logger: Logger
  private _isInitialized = false
  private environment: Environment
  private currentNetwork: Network
  private networkConfig: INetwork
  private httpClient: HttpClient

  // Service Modules
  /** Wallet service module */
  public wallet: WalletService
  /** Transaction service module */
  public transaction: TransactionService
  /** Staking service module */
  public staking: StakingService
  /** Governance service module */
  public governance: GovernanceService
  /** Contract service module */
  public contract: ContractService

  /**
   * Create Meta Earth JS SDK instance
   * @param options SDK configuration options
   */
  constructor(options: SDKOptions = {}) {
    this.environment = detectEnvironment()
    this.currentNetwork = options.config?.network || DEFAULT_CONFIG.network!
    this.config = { ...DEFAULT_CONFIG, ...options.config }
    this.logger = new Logger({
      enabled: this.config.debug || false,
      prefix: '[Meta Earth JS SDK]',
    })

    // Initialize network config
    this.networkConfig = getNetworkConfig(this.currentNetwork)

    // Initialize HTTP client
    this.httpClient = createHttpClientWithNetwork(this.networkConfig, this.config.timeout)
    this.httpClient.setLayer(this.config.layer || 'hub')

    this.logger.info('SDK initialized with network config:', {
      network: this.currentNetwork,
      layer: this.config.layer,
      hubUrl: this.networkConfig.hub.restfulUrl,
      rollupUrl: this.networkConfig.rollup.restfulUrl,
    })

    // Initialize Services
    const ensureInitialized = () => this.ensureInitialized()

    this.wallet = new WalletService({
      logger: this.logger,
      wallets: new Map(),
      ensureInitialized,
      api: new WalletApi(this.httpClient),
    })

    this.transaction = new TransactionService(
      this.logger,
      this.httpClient,
      this.wallet,
      ensureInitialized,
    )

    this.staking = new StakingService(this.logger, this.httpClient, this.wallet, ensureInitialized)

    this.governance = new GovernanceService(
      this.logger,
      this.httpClient,
      this.wallet,
      ensureInitialized,
    )

    this.contract = new ContractService(
      this.logger,
      this.httpClient,
      this.wallet,
      ensureInitialized,
    )
  }

  /**
   * Initialize SDK
   * Validate configuration and prepare services
   * @returns Promise<void>
   * @throws Error if initialization fails
   */
  public async initialize(): Promise<void> {
    if (this._isInitialized) {
      this.logger.warn('SDK is already initialized')
      return
    }

    this.logger.info('Initializing SDK...', {
      version: SDK_VERSION,
      environment: this.environment,
      network: this.currentNetwork,
    })

    try {
      this._isInitialized = true
      this.logger.info('SDK initialized successfully')
    } catch (error: any) {
      this.logger.error('Failed to initialize SDK:', error)
      throw error
    }
  }

  /**
   * Get SDK version
   * @returns SDK version string
   */
  public getVersion(): string {
    return SDK_VERSION
  }

  /**
   * Get current runtime environment
   * @returns Environment ('browser' | 'node')
   */
  public getEnvironment(): Environment {
    return this.environment
  }

  /**
   * Get readonly copy of current SDK configuration
   * @returns SDKConfig
   */
  public getConfig(): Readonly<SDKConfig> {
    return { ...this.config }
  }

  /**
   * Update SDK configuration
   * Supports dynamic updates for network, layer, timeout, etc.
   * @param config Partial configuration object
   */
  public setConfig(config: Partial<SDKConfig>): void {
    const oldNetwork = this.currentNetwork
    this.config = { ...this.config, ...config }

    // If network changes, update network config and HTTP client
    if (config.network && config.network !== oldNetwork) {
      this.currentNetwork = config.network
      this.networkConfig = getNetworkConfig(this.currentNetwork)
      this.httpClient.setNetworkConfig(this.networkConfig)
      this.logger.info('Network changed, updated HTTP client base URLs:', {
        network: this.currentNetwork,
        hubUrl: this.networkConfig.hub.restfulUrl,
        rollupUrl: this.networkConfig.rollup.restfulUrl,
      })
    }

    // If layer changes, update HTTP client
    if (config.layer) {
      this.httpClient.setLayer(config.layer)
    }

    // If timeout changes, update HTTP client
    if (config.timeout) {
      this.httpClient.setTimeout(config.timeout)
    }

    this.logger.setEnabled(this.config.debug || false)
    this.logger.info('SDK configuration updated:', this.config)
  }

  /**
   * Check if SDK is initialized
   * @returns boolean
   */
  public isInitialized(): boolean {
    return this._isInitialized
  }

  /**
   * Destroy SDK instance
   * Clean up resources and state
   */
  public destroy(): void {
    this.logger.info('Destroying SDK...')
    this._isInitialized = false
    this.logger.info('SDK destroyed')
  }

  /**
   * Get current connected network
   * @returns Network ('testnet' | 'mainnet')
   */
  public getCurrentNetwork(): Network {
    return this.currentNetwork
  }

  /**
   * Switch current network
   * Automatically updates network config and HTTP client connection
   * @param network Target network ('testnet' | 'mainnet')
   * @throws Error if switch fails
   */
  public setNetwork(network: Network): void {
    try {
      if (this.currentNetwork === network) {
        this.logger.warn('Network is already set to:', network)
        return
      }

      this.logger.info('Setting network...', { network })
      this.currentNetwork = network
      this.config = { ...this.config, network }

      // Update network config
      this.networkConfig = getNetworkConfig(this.currentNetwork)

      // Sync update HTTP client network config
      this.httpClient.setNetworkConfig(this.networkConfig)

      this.logger.info('Network set successfully', {
        network,
        hubUrl: this.networkConfig.hub.restfulUrl,
        rollupUrl: this.networkConfig.rollup.restfulUrl,
      })
    } catch (error: any) {
      this.logger.error('Failed to set network:', error)
      throw error
    }
  }

  /**
   * Internal method: Ensure SDK is initialized
   * @throws Error if SDK is not initialized
   */
  private ensureInitialized(): void {
    if (!this._isInitialized) {
      throw new Error('SDK is not initialized. Please call initialize() first.')
    }
  }
}

// Export a default instance
export const sdk = new MetaEarthSDK()
