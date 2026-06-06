/**
 * Staking related type definitions
 */

/**
 * Flexible staking parameters
 */
export interface FlexibleStakingParams {
  address: string
  amount: string
  denom: string
  validatorAddress?: string
}

/**
 * Staking status
 */
export interface StakingStatus {
  delegated: string
  rewards: string
  unbonding: string
}

/**
 * Validator information
 */
export interface ValidatorInfo {
  address: string
  name: string
  votingPower: string
  commission: string
}
