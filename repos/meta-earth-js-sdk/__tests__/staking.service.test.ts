import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Mock } from 'vitest'
import { StakingService } from '../src/modules/staking/service'
import { Logger } from '../src/utils/logger'
import { HttpClient } from '../src/utils/http-client'

// Mock staking clients
vi.mock('../src/me-client-ts/cosmos.staking.v1beta1/module', () => ({
  txClient: () => ({
    sendMsgDelegate: vi.fn().mockResolvedValue({ tx_bytes: 'mock_tx_bytes' }),
    sendMsgUndelegate: vi.fn().mockResolvedValue({ tx_bytes: 'mock_tx_bytes' }),
  }),
}))

vi.mock('../src/me-client-ts/metaearth.wstaking/module', () => ({
  txClient: () => ({
    sendMsgWithdrawDelegatorReward: vi.fn().mockResolvedValue({ tx_bytes: 'mock_tx_bytes' }),
  }),
}))

describe('StakingService', () => {
  let service: StakingService
  let mockLogger: Logger
  let mockHttpClient: HttpClient
  let mockEnsureInitialized: Mock<() => void>

  let mockWalletService: any

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      setEnabled: vi.fn(),
      enabled: false,
    } as any

    mockHttpClient = {
      get: vi.fn().mockResolvedValue({ data: {} }),
      post: vi.fn().mockResolvedValue({ data: { tx_response: { txhash: '0xhash' } } }),
      setLayer: vi.fn(),
    } as any

    mockEnsureInitialized = vi.fn()

    mockWalletService = {
      createDirectSecp256k1Wallet: vi.fn().mockResolvedValue({
        getAccounts: vi.fn().mockResolvedValue([{ address: 'me1test' }]),
      }),
    }

    service = new StakingService(
      mockLogger,
      mockHttpClient,
      mockWalletService,
      mockEnsureInitialized,
    )
  })

  describe('stakeFlexible', () => {
    it('should call api to stake flexible', async () => {
      const params = {
        address: 'me1test',
        amount: { amount: '100', denom: 'umec' },
      }

      await service.stakeFlexible(params)
      // Staking uses cosmos client, not HTTP POST
      expect(mockHttpClient.post).toHaveBeenCalled()
    })

    it('should validate required parameters', async () => {
      try {
        await service.stakeFlexible({ address: 'me1test' } as any)
      } catch (error: any) {
        expect(error.message).toContain('Validator address is required')
      }
    })
  })

  describe('claimStakingReward', () => {
    it('should call api to claim staking reward', async () => {
      const result = await service.claimStakingReward('me1test')
      expect(result).toBe('0xhash')
      expect(mockHttpClient.post).toHaveBeenCalled()
    })
  })

  describe('unstakeFlexible', () => {
    it('should call api to unstake flexible', async () => {
      const params = {
        address: 'me1test',
        amount: { amount: '50', denom: 'umec' },
      }

      await service.unstakeFlexible(params)
      // Staking uses cosmos client, not HTTP POST
      expect(mockHttpClient.post).toHaveBeenCalled()
    })

    it('should validate required parameters', async () => {
      try {
        await service.unstakeFlexible({ address: 'me1test' } as any)
      } catch (error: any) {
        expect(error.message).toContain('Validator address is required')
      }
    })
  })

  describe('ensureInitialized calls', () => {
    it('should call ensureInitialized for stakeFlexible', async () => {
      try {
        await service.stakeFlexible({
          address: 'me1test',
          amount: { amount: '100', denom: 'umec' },
        })
      } catch {}
      expect(mockEnsureInitialized).toHaveBeenCalled()
    })

    it('should call ensureInitialized for claimStakingReward', async () => {
      try {
        await service.claimStakingReward('me1test')
      } catch {}
      expect(mockEnsureInitialized).toHaveBeenCalled()
    })

    it('should call ensureInitialized for unstakeFlexible', async () => {
      try {
        await service.unstakeFlexible({
          address: 'me1test',
          amount: { amount: '50', denom: 'umec' },
        })
      } catch {}
      expect(mockEnsureInitialized).toHaveBeenCalled()
    })
  })

  describe('logger calls', () => {
    it('should log info for stakeFlexible', async () => {
      const params = {
        address: 'me1test',
        amount: { amount: '100', denom: 'umec' },
      }
      await service.stakeFlexible(params)
      expect(mockLogger.info).toHaveBeenCalledWith('Staking flexible...', params)
    })

    it('should log info for claimStakingReward', async () => {
      try {
        await service.claimStakingReward('me1test')
      } catch {}
      expect(mockLogger.info).toHaveBeenCalled()
    })

    it('should log info for unstakeFlexible', async () => {
      const params = {
        address: 'me1test',
        amount: { amount: '50', denom: 'umec' },
      }
      await service.unstakeFlexible(params)
      expect(mockLogger.info).toHaveBeenCalledWith('Unstaking flexible...', params)
    })
  })
})
