import { describe, expect, it } from 'vitest'
import { MetaEarthSDK } from '../src/sdk'

describe('MetaEarthSDK', () => {
  it('should keep config network in sync after setNetwork', () => {
    const sdk = new MetaEarthSDK({
      config: {
        network: 'testnet',
      },
    })

    sdk.setNetwork('mainnet')

    expect(sdk.getCurrentNetwork()).toBe('mainnet')
    expect(sdk.getConfig().network).toBe('mainnet')
  })
})
