import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Mock } from 'vitest'
import { GovernanceService } from '../src/modules/governance/service'
import { GovernanceApi } from '../src/api/governance'
import { Logger } from '../src/utils/logger'
import { HttpClient } from '../src/utils/http-client'

describe('GovernanceService', () => {
  let service: GovernanceService
  let mockLogger: Logger
  let mockHttpClient: HttpClient
  let mockEnsureInitialized: Mock<() => void>
  let mockWalletService: {
    createDirectSecp256k1Wallet: Mock
  }

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      setEnabled: vi.fn(),
      enabled: false,
    } as any

    mockHttpClient = {
      get: vi.fn().mockResolvedValue({ data: [] }),
      post: vi.fn().mockResolvedValue({ data: { txHash: '0xhash' } }),
      setLayer: vi.fn(),
    } as any

    mockEnsureInitialized = vi.fn()
    mockWalletService = {
      createDirectSecp256k1Wallet: vi.fn().mockResolvedValue('mock-signer'),
    }

    vi.spyOn(GovernanceApi.prototype, 'createSoftwareUpgradeProposal').mockResolvedValue(
      '0xproposal-hash',
    )
    vi.spyOn(GovernanceApi.prototype, 'voteProposal').mockResolvedValue('0xvote-hash')

    service = new GovernanceService(
      mockLogger,
      mockHttpClient,
      mockWalletService as any,
      mockEnsureInitialized,
    )
  })

  describe('submitSoftwareUpgradeProposal', () => {
    it('should call api to submit proposal', async () => {
      const params = {
        proposer: 'me1proposer',
        initialDeposit: [{ amount: '1000', denom: 'umec' }],
        content: {
          title: 'Test Proposal',
          description: 'Test Description',
          plan: {
            name: 'upgrade-1',
            height: '100',
          },
        },
      }

      await service.submitSoftwareUpgradeProposal(params)

      expect(mockWalletService.createDirectSecp256k1Wallet).toHaveBeenCalledWith({
        address: 'me1proposer',
      })
      expect(GovernanceApi.prototype.createSoftwareUpgradeProposal).toHaveBeenCalledWith(
        params,
        'mock-signer',
      )
    })

    it('should validate required parameters', async () => {
      await expect(
        service.submitSoftwareUpgradeProposal({
          proposer: 'me1proposer',
          initialDeposit: [{ amount: '1000', denom: 'umec' }],
          content: {
            title: '',
            description: 'Test Description',
            plan: {
              name: '',
              height: '',
            },
          },
        }),
      ).rejects.toThrow('Missing required fields')
    })
  })

  describe('voteProposal', () => {
    it('should call api to vote', async () => {
      const params = {
        proposalId: 1,
        voter: 'me1voter',
        option: 'yes' as const,
      }

      await service.voteProposal(params)

      expect(mockWalletService.createDirectSecp256k1Wallet).toHaveBeenCalledWith({
        address: 'me1voter',
      })
      expect(GovernanceApi.prototype.voteProposal).toHaveBeenCalledWith(params, 'mock-signer')
    })

    it('should validate required parameters', async () => {
      await expect(
        service.voteProposal({
          voter: 'me1voter',
          option: 'yes',
        } as any),
      ).rejects.toThrow('proposalId, voter, and option are required')
    })
  })

  describe('ensureInitialized calls', () => {
    it('should call ensureInitialized for submitSoftwareUpgradeProposal', async () => {
      await service
        .submitSoftwareUpgradeProposal({
          proposer: 'me1proposer',
          initialDeposit: [{ amount: '1000', denom: 'umec' }],
          content: {
            title: 'Test Proposal',
            description: 'Test Description',
            plan: {
              name: 'upgrade-1',
              height: '100',
            },
          },
        })
        .catch(() => {})

      expect(mockEnsureInitialized).toHaveBeenCalled()
    })

    it('should call ensureInitialized for voteProposal', async () => {
      await service
        .voteProposal({
          proposalId: 1,
          voter: 'me1voter',
          option: 'yes',
        })
        .catch(() => {})

      expect(mockEnsureInitialized).toHaveBeenCalled()
    })
  })

  describe('logger calls', () => {
    it('should log info for submitSoftwareUpgradeProposal', async () => {
      const params = {
        proposer: 'me1proposer',
        initialDeposit: [{ amount: '1000', denom: 'umec' }],
        content: {
          title: 'Test Proposal',
          description: 'Test Description',
          plan: {
            name: 'upgrade-1',
            height: '100',
          },
        },
      }

      await service.submitSoftwareUpgradeProposal(params).catch(() => {})

      expect(mockLogger.info).toHaveBeenCalledWith('Submitting SoftwareUpgradeProposal...', params)
    })

    it('should log info for voteProposal', async () => {
      const params = {
        proposalId: 1,
        voter: 'me1voter',
        option: 'yes' as const,
      }

      await service.voteProposal(params).catch(() => {})

      expect(mockLogger.info).toHaveBeenCalledWith('Voting on proposal...', params)
    })
  })
})
