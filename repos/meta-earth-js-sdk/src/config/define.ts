/** Chain ID */
export const CHAIN_ID: string = 'me-chain'
/** Gas limit */
export const gas_limit = 500000 // 2e5
/** Gas price */
export const gas_price = 0.02

/** Max gas set */
export const gas_max_set = `500000`
/** Gas adjustment */
export const gas_adj = 2.2
/** Gas float value */
export const gas_floatValue = 7000

/** Min gas fee */
export const gas_min_fee = +gas_max_set * gas_price

/** Chain ID name */
export const chainIdName = `me-chain`

/** Gas fee */
export const gas_fee = gas_limit * gas_price

/** Address prefix */
export const PREFIX: string = 'me'

/**
 * Network Configuration Interface
 */
export interface INetwork {
  name: Readonly<string>
  hub: {
    restfulUrl: string
    rpcUrl: string
    grpcUrl: string
  }
  rollup: {
    restfulUrl: string
    rpcUrl: string
    grpcUrl: string
  }
}

/**
 * // Target server configuration
    const targets = {
      '/hub': 'http://118.175.0.230:1317',
      '/hub-rpc': 'http://118.175.0.230:26657',
      '/hub-grpc': 'http://118.175.0.230:9090',
      '/rollup': 'http://118.175.0.230:3317',
      '/rollup-rpc': 'http://118.175.0.230:46657',
      '/rollup-grpc': 'http://118.175.0.230:9090',
    }
 */
/**
 * Testnet Configuration
 */
export const TEST_NET_CONFIG: INetwork = {
  name: 'TestNet',
  hub: {
    restfulUrl: `http://118.175.0.249:1317`,
    rpcUrl: `http://118.175.0.249:26657`,
    grpcUrl: `http://118.175.0.249:9090`,
  },
  rollup: {
    restfulUrl: `http://118.175.0.249:3317`,
    rpcUrl: `http://118.175.0.249:46657`,
    grpcUrl: `http://118.175.0.249:9290`,
  },
}

/**
 * Mainnet Configuration
 */
export const MAIN_NET_CONFIG: INetwork = {
  name: 'MainNet',
  hub: {
    restfulUrl: `http://118.175.0.247:11317`,
    rpcUrl: `http://118.175.0.247:16657`,
    grpcUrl: `http://118.175.0.247:19090`,
  },
  rollup: {
    restfulUrl: `http://118.175.0.247:23013`,
    rpcUrl: `http://118.175.0.247:23011`,
    grpcUrl: `http://118.175.0.247:23012`,
  },
}
/**
 * Unified Network Configuration Map
 * Get corresponding configuration based on network name (testnet/mainnet)
 */
export const NETWORK_CONFIGS: Record<string, INetwork> = {
  testnet: TEST_NET_CONFIG,
  mainnet: MAIN_NET_CONFIG,
}

/**
 * Get network configuration by network name
 */
export function getNetworkConfig(network: string): INetwork {
  const config = NETWORK_CONFIGS[network]
  if (!config) {
    throw new Error(`Network configuration not found for: ${network}`)
  }
  return config
}
