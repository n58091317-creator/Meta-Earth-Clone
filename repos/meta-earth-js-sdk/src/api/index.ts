/**
 * API Interface Method Exports
 * Export all blockchain related API interface methods
 */

import { TEST_NET_CONFIG } from '../config/define'
import { httpClient } from '../utils/http-client'

// HTTP Client related
export {
  HttpClient,
  HttpError,
  createHttpClient,
  createHttpClientWithNetwork,
  httpClient,
} from '../utils/http-client'
export type { HttpRequestConfig, HttpResponse } from '../utils/http-client'

// API Type Definitions
export * from './types'

// Transaction related API
export * from './transaction'

// Staking related API
export * from './staking'

// Governance related API
export * from './governance'

// Contract related API
export * from './contract'

// Wallet related API
export * from './wallet'

// Initialize default HTTP client instance, use testnet configuration
httpClient.setNetworkConfig(TEST_NET_CONFIG)
httpClient.setLayer('hub')
