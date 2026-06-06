/**
 * Transaction related type definitions
 */

import type { Layer } from './base'

// TransferParams is defined in ../types.ts, using Coin[] format

/**
 * Balance information
 */
export interface BalanceInfo {
  balance: string
  denom: string
}

/**
 * Common parameters (for future extension)
 */
export interface QueryParams {
  layer?: Layer
}
