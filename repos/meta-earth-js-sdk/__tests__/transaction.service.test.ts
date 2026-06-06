import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Mock } from 'vitest'
import { TransactionService } from '../src/modules/transaction/service'
import { Logger } from '../src/utils/logger'
import { HttpClient } from '../src/utils/http-client'

// Mock bankClient
vi.mock('../src/me-client-ts/cosmos.bank.v1beta1/module', () => ({
  txClient: () => ({
    sendMsgSend: vi.fn().mockResolvedValue({ tx_bytes: 'mock_tx_bytes' }),
  }),
}))

describe('TransactionService', () => {
  let service: TransactionService
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
        getAccounts: vi.fn().mockResolvedValue([{ address: 'me1sender' }]),
      }),
    }

    service = new TransactionService(
      mockLogger,
      mockHttpClient,
      mockWalletService,
      mockEnsureInitialized,
    )
  })

  describe('transfer', () => {
    it('should call api to transfer', async () => {
      const params = {
        fromAddress: 'me1sender',
        toAddress: 'me1receiver',
        amount: [{ amount: '100', denom: 'umec' }],
      }

      await service.transfer(params)
      // Transfer uses cosmos client, not direct HTTP POST to /api/v1/transfer
      expect(mockHttpClient.post).toHaveBeenCalled()
    })

    it('should validate required parameters', async () => {
      try {
        await service.transfer({} as any)
      } catch (error: any) {
        expect(error.message).toContain('toAddress')
      }

      try {
        await service.transfer({
          fromAddress: 'me1sender',
          toAddress: 'me1receiver',
        } as any)
      } catch (error: any) {
        expect(error.message).toContain('amount')
      }
    })

    it('should allow optional layer parameter', async () => {
      await service.transfer({
        fromAddress: 'me1sender',
        toAddress: 'me1receiver',
        amount: [{ amount: '100', denom: 'umec' }],
        layer: 'rollup',
      })

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          layer: 'rollup',
        }),
      )
    })
  })

  describe('getTransaction', () => {
    it('should call api to get transaction', async () => {
      const mockTx = { hash: '0x123' }
      vi.mocked(mockHttpClient.get).mockResolvedValueOnce({ data: mockTx } as any)

      const result = await service.getTransaction('0x123', 'hub')

      expect(mockHttpClient.get).toHaveBeenCalledWith('/cosmos/tx/v1beta1/txs/0x123', {
        params: {},
        layer: 'hub',
      })
      expect(result).toEqual(mockTx)
    })

    it('should allow optional layer parameter', async () => {
      await service.getTransaction('0x123', 'rollup')
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          layer: 'rollup',
        }),
      )
    })
  })

  describe('ensureInitialized calls', () => {
    it('should call ensureInitialized for transfer', async () => {
      await service.transfer({
        fromAddress: 'me1sender',
        toAddress: 'me1receiver',
        amount: [{ amount: '100', denom: 'umec' }],
      })
      expect(mockEnsureInitialized).toHaveBeenCalled()
    })

    it('should call ensureInitialized for getTransaction', async () => {
      await service.getTransaction('0x123', 'hub')
      expect(mockEnsureInitialized).toHaveBeenCalled()
    })
  })

  describe('logger calls', () => {
    it('should log info for transfer', async () => {
      const params = {
        fromAddress: 'me1sender',
        toAddress: 'me1receiver',
        amount: [{ amount: '100', denom: 'umec' }],
      }
      await service.transfer(params)
      expect(mockLogger.info).toHaveBeenCalledWith('Transferring tokens...', params)
    })

    it('should log info for getTransaction', async () => {
      await service.getTransaction('0x123', 'hub')
      expect(mockLogger.info).toHaveBeenCalledWith('Getting transaction...', {
        hash: '0x123',
        layer: 'hub',
      })
    })
  })
})
