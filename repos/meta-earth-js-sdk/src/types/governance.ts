/**
 * Governance related type definitions
 */

/**
 * Proposal parameters
 */
export interface ProposalParams {
  title: string
  description: string
  proposalType: string
  deposit: string
  denom: string
  plan?: {
    name: string
    height: string | number
    time?: string
    info?: string
    upgradedClientState?: any
  }
}

/**
 * Vote parameters
 */
export interface VoteParams {
  proposalId: number
  voter: string
  option: string
}

/**
 * Proposal status
 */
export type ProposalStatus =
  | 'unspecified'
  | 'deposit_period'
  | 'voting_period'
  | 'passed'
  | 'rejected'
  | 'failed'

/**
 * Proposal information
 */
export interface ProposalInfo {
  id: number
  status: ProposalStatus
  title: string
  description: string
  submitTime: string
  depositEndTime: string
  votingStartTime: string
  votingEndTime: string
}

/**
 * Vote option
 */
export type VoteOption = 'yes' | 'no' | 'abstain' | 'no_with_veto'
