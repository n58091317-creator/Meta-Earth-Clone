/**
 * Meta Earth JS SDK
 * TypeScript SDK supporting Browser and Node.js environments
 * Supports Meta Earth blockchain wallet management, transfer, staking, governance, and contract operations
 */

// Must import polyfills first to ensure browser compatibility
import './polyfills'

import { sdk } from './sdk'

// Export main class
export { MetaEarthSDK, sdk } from './sdk'

// Export types
export type {
  SDKConfig,
  SDKOptions,
  Environment,
  Network,
  Layer,
  ContractLayer,
  WalletInfo,
  TransferParams,
  FlexibleStakingParams,
  ProposalParams,
  VoteParams,
  DeployContractParams,
  ExecuteContractParams,
  BalanceInfo,
} from './types'

// Export utility functions
export { detectEnvironment, isBrowser, isNode } from './utils/environment'
export { Logger } from './utils/logger'

// Export wallet creation module
export { createMeWallet } from './modules/wallet/service'
export type { CreateMeWalletParams, MeWalletAccount } from './modules/wallet/service'

// Export API interface methods
export * from './api'

// Default export
export default sdk
