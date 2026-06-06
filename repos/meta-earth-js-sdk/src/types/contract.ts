/**
 * Contract related type definitions
 */

import type { ContractLayer } from './base'

/**
 * Contract deployment parameters
 */
export interface DeployContractParams {
  codeId: number
  initMsg: any
  label: string
  layer?: ContractLayer
}

/**
 * Contract execution parameters
 */
export interface ExecuteContractParams {
  contractAddress: string
  msg: any
  sender: string
  layer?: ContractLayer
}

/**
 * Contract information
 */
export interface ContractInfo {
  address: string
  codeId: number
  creator: string
  admin: string
  label: string
  created: string
  ibcPortId: string
}

/**
 * Contract query parameters
 */
export interface QueryContractParams {
  contractAddress: string
  msg: any
}
