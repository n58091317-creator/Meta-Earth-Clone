import { MsgSubmitProposal } from './me-client-ts/cosmos.gov.v1beta1/module'

/**
 * Network Type
 */
export type Network = 'testnet' | 'mainnet'

/**
 * Layer Type
 */
export type Layer = 'hub' | 'rollup'

/**
 * Contract Layer Type
 */
export type ContractLayer = 'evm' | 'wasm'

/**
 * SDK Configuration Interface
 */
export interface SDKConfig {
  timeout?: number
  debug?: boolean
  network?: Network
  layer?: Layer
}

/**
 * Environment Type
 */
export type Environment = 'browser' | 'node' | 'unknown'

/**
 * SDK Options
 */
export interface SDKOptions {
  config?: SDKConfig
}

/**
 * Wallet Information
 */
export interface WalletInfo {
  mnemonic?: string
  privateKey?: string
  privateKeyBuffer?: Buffer
  address?: string
  index?: number
}

/**
 * Coin
 */
export interface Coin {
  denom: string
  amount: string
}

/**
 * Transfer Parameters
 */
export interface TransferParams {
  fromAddress: string
  toAddress: string
  amount: Coin[]
  gas?: string
  layer?: Layer
  memo?: string
}

/**
 * Flexible Staking Parameters
 */
export interface FlexibleStakingParams {
  address: string
  amount: Coin
  layer?: Layer
}

/**
 * Proposal Parameters
 * Based on cosmos.gov.v1 MsgSubmitProposal structure
 */
export interface ProposalParams {
  /** Proposer address */
  proposer: string
  /** Initial deposit amount */
  // Default: 100000000 umec
  initialDeposit: Coin[]
  /** Memo for the transaction */
  memo?: string
  /** Upgrade plan for software_upgrade proposals */
  content: SoftwareUpgradeProposalParams
  /** Target layer */
  layer?: Layer
}

export interface SoftwareUpgradeProposalParams {
  /** Proposal title */
  title: string
  /** Proposal description */
  description: string
  /** Proposal plan */
  plan: {
    name: string // Upgrade version name
    height: string | number // Upgrade block height
    time?: string // Upgrade time
    info?: string // Upgrade info
    upgradedClientState?: any // Upgraded client state
  }
}

// Override content type for SoftwareUpgradeProposal
export interface SoftwareUpgradeProposalMsg extends Omit<MsgSubmitProposal, 'content'> {
  content: SoftwareUpgradeProposalParams
}

/**
 * Vote Parameters
 */
export interface VoteParams {
  proposalId: number
  voter: string
  option: 'yes' | 'no' | 'abstain' | 'no_with_veto'
  metadata?: string
  layer?: Layer
}

/**
 * Contract Deployment Parameters
 */
export interface DeployContractParams {
  sender: string
  codeId: number
  initMsg: any
  label?: string
  funds?: { denom: string; amount: string }[]
  admin?: string
  layer?: ContractLayer
  networkLayer?: Layer
}

/**
 * Contract Execution Parameters
 */
export interface ExecuteContractParams {
  contractAddress: string
  msg: any
  sender: string
  funds?: { denom: string; amount: string }[]
  layer?: ContractLayer
  networkLayer?: Layer
}

/**
 * Store Code Parameters
 */
export interface StoreCodeParams {
  sender: string
  wasmByteCode: string | Uint8Array
  instantiatePermission?: any
  layer?: ContractLayer
  networkLayer?: Layer
}

/**
 * Balance Information
 */
export interface BalanceInfo {
  amount: string
  denom: string
}
