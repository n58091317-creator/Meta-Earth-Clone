/**
 * Modules exports
 */

// Wallet module
export { WalletService } from './wallet/service'
export type { WalletServiceConfig } from './wallet/service'

// Transaction module
export { TransactionService } from './transaction/service'

// Staking module
export { StakingService } from './staking/service'

// Governance module
export { GovernanceService } from './governance/service'

// Contract module
export { ContractService } from './contract/service'

// Wallet creation utility
export { createMeWallet } from './wallet/service'
