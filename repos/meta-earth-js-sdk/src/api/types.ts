/**
 * API Response Type Definitions
 * Define response types for all API interfaces
 */

/**
 * Governance Proposal
 */
export interface Proposal {
  proposalId: string
  content: {
    '@type': string
    title: string
    description: string
    [key: string]: any
  }
  status: string
  finalTallyResult: {
    yes: string
    abstain: string
    no: string
    noWithVeto: string
  }
  submitTime: string
  depositEndTime: string
  votingStartTime: string
  votingEndTime: string
  totalDeposit: Array<{
    denom: string
    amount: string
  }>
}

/**
 * Proposal Status
 */
export enum ProposalStatus {
  PROPOSAL_STATUS_UNSPECIFIED = 'PROPOSAL_STATUS_UNSPECIFIED',
  PROPOSAL_STATUS_DEPOSIT_PERIOD = 'PROPOSAL_STATUS_DEPOSIT_PERIOD',
  PROPOSAL_STATUS_VOTING_PERIOD = 'PROPOSAL_STATUS_VOTING_PERIOD',
  PROPOSAL_STATUS_PASSED = 'PROPOSAL_STATUS_PASSED',
  PROPOSAL_STATUS_REJECTED = 'PROPOSAL_STATUS_REJECTED',
  PROPOSAL_STATUS_FAILED = 'PROPOSAL_STATUS_FAILED',
}

/**
 * Network Fees
 */
export interface NetworkFees {
  low: number
  medium: number
  high: number
  baseFee?: string
  gasPrice?: string
}

/**
 * Transaction Response
 */
export interface TransactionResponse {
  /** Transaction body */
  tx: any
  /** Transaction response details */
  tx_response: TxResponse
}

/**
 * Transaction Response Details
 */
export interface TxResponse {
  /** Block height */
  height: string
  /** Transaction hash */
  txhash: string
  /** Codespace */
  codespace: string
  /** Response code (0 means success) */
  code: number
  /** Response data */
  data: string
  /** Raw log */
  raw_log: string
  /** Logs array */
  logs: any
  /** Additional info */
  info: string
  /** Gas wanted */
  gas_wanted: string
  /** Gas used */
  gas_used: string
  /** Transaction details */
  tx: any
  /** Timestamp */
  timestamp: string
  /** Events array */
  events: any
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    nextKey?: string
    total: string
  }
}

/**
 * Simulate Transaction Request Parameters
 */
export interface SimulateRequest {
  tx: Tx
  tx_bytes: string
}

export interface Tx {
  auth_info: AuthInfo
  body: Body
  signatures: string[]
}

export interface AuthInfo {
  fee: Fee
  signer_infos: SignerInfo[]
  tip?: Tip
}

export interface Fee {
  amount: Coin[]
  gas_limit: string
  granter: string
  payer: string
}

export interface Coin {
  amount: string
  denom: string
}

export interface SignerInfo {
  mode_info: ModeInfo
  public_key: PublicKey
  sequence: string
}

export interface ModeInfo {
  multi?: {
    bitarray: {
      elems: string
      extra_bits_stored: number
    }
    mode_infos: object[]
  }
  single?: {
    mode: string
  }
}

export interface PublicKey {
  type_url: string
  value: string
}

export interface Tip {
  amount: Coin[]
  tipper: string
}

export interface Body {
  extension_options?: {
    type_url: string
    value: string
  }[]
  memo: string
  messages: {
    type_url: string
    value: string
  }[]
  non_critical_extension_options?: {
    type_url: string
    value: string
  }[]
  timeout_height: string
}

/**
 * Simulate Transaction Response
 */
export interface SimulateResponse {
  gas_info: GasInfo
  result: Result
}

export interface GasInfo {
  gas_wanted: string
  gas_used: string
}

export interface Result {
  data: string
  log: string
  events: any[]
}

/**
 * Send Transaction Response
 */
export interface SendTransactionResponse {
  tx_response: TxResponse
}
