/**
 * Base type definitions
 */

/**
 * Network type
 */
export type Network = 'testnet' | 'mainnet'

/**
 * Layer type
 */
export type Layer = 'hub' | 'rollup'

/**
 * Contract layer type
 */
export type ContractLayer = 'evm' | 'wasm'

/**
 * Environment type
 */
export type Environment = 'browser' | 'node' | 'unknown'

/**
 * SDK configuration interface
 */
export interface SDKConfig {
  apiKey?: string
  baseURL?: string
  timeout?: number
  debug?: boolean
  network?: Network
  layer?: Layer
}

/**
 * SDK options
 */
export interface SDKOptions {
  config?: SDKConfig
}
