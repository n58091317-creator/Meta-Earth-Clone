import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Mock } from 'vitest'
import { ContractService } from '../src/modules/contract/service'
import { ContractApi } from '../src/api/contract'
import { Logger } from '../src/utils/logger'
import { HttpClient } from '../src/utils/http-client'

describe('ContractService', () => {
  let service: ContractService
  let mockLogger: Logger
  let mockHttpClient: HttpClient
  let mockEnsureInitialized: Mock<() => void>
  let mockWalletService: {
    createDirectSecp256k1Wallet: Mock
    getWalletAddresses: Mock
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
      get: vi.fn().mockResolvedValue({ data: {} }),
      post: vi.fn().mockResolvedValue({ data: { txHash: '0xhash' } }),
      setLayer: vi.fn(),
    } as any

    mockEnsureInitialized = vi.fn()

    mockWalletService = {
      createDirectSecp256k1Wallet: vi.fn().mockResolvedValue('mock-signer'),
      getWalletAddresses: vi.fn().mockReturnValue(['me1cached']),
    }

    vi.spyOn(ContractApi.prototype, 'createInstantiateContract').mockResolvedValue('0xdeploy-hash')
    vi.spyOn(ContractApi.prototype, 'createExecuteContract').mockResolvedValue('0xexecute-hash')

    service = new ContractService(
      mockLogger,
      mockHttpClient,
      mockWalletService as any,
      mockEnsureInitialized,
    )
  })

  describe('deployContract', () => {
    it('should use params.sender to create signer', async () => {
      const params = {
        codeId: 12345,
        initMsg: { count: 0 },
        label: 'Test Contract',
        sender: 'me1sender',
      }

      await service.deployContract(params as any)

      expect(mockWalletService.createDirectSecp256k1Wallet).toHaveBeenCalledWith({
        address: 'me1sender',
      })
      expect(ContractApi.prototype.createInstantiateContract).toHaveBeenCalledWith(
        params,
        'mock-signer',
      )
    })

    it('should validate required parameters', async () => {
      await expect(
        service.deployContract({
          initMsg: { count: 0 },
          label: 'Test Contract',
          sender: 'me1sender',
        } as any),
      ).rejects.toThrow('codeId and initMsg are required')
    })

    it('should throw error for EVM layer', async () => {
      await expect(
        service.deployContract({
          codeId: 12345,
          initMsg: { count: 0 },
          label: 'Test Contract',
          sender: 'me1sender',
          layer: 'evm',
        }),
      ).rejects.toThrow('EVM contract deployment not supported yet')
    })
  })

  describe('executeContract', () => {
    it('should call api to execute contract', async () => {
      const params = {
        contractAddress: 'me1contract',
        msg: { increment: {} },
        sender: 'me1sender',
      }

      await service.executeContract(params)

      expect(mockWalletService.createDirectSecp256k1Wallet).toHaveBeenCalledWith({
        address: 'me1sender',
      })
      expect(ContractApi.prototype.createExecuteContract).toHaveBeenCalledWith(
        params,
        'mock-signer',
      )
    })

    it('should validate required parameters', async () => {
      await expect(
        service.executeContract({
          msg: { increment: {} },
          sender: 'me1sender',
        } as any),
      ).rejects.toThrow('contractAddress, msg, and sender are required')
    })

    it('should throw error for EVM layer', async () => {
      await expect(
        service.executeContract({
          contractAddress: 'me1contract',
          msg: { increment: {} },
          sender: 'me1sender',
          layer: 'evm',
        }),
      ).rejects.toThrow('EVM contract execution not supported yet')
    })
  })

  describe('ensureInitialized calls', () => {
    it('should call ensureInitialized for deployContract', async () => {
      await service
        .deployContract({
          codeId: 12345,
          initMsg: { count: 0 },
          label: 'Test Contract',
          sender: 'me1sender',
        } as any)
        .catch(() => {})

      expect(mockEnsureInitialized).toHaveBeenCalled()
    })

    it('should call ensureInitialized for executeContract', async () => {
      await service
        .executeContract({
          contractAddress: 'me1contract',
          msg: { increment: {} },
          sender: 'me1sender',
        })
        .catch(() => {})

      expect(mockEnsureInitialized).toHaveBeenCalled()
    })
  })

  describe('logger calls', () => {
    it('should log info for deployContract', async () => {
      const params = {
        codeId: 12345,
        initMsg: { count: 0 },
        label: 'Test Contract',
        sender: 'me1sender',
      }

      await service.deployContract(params as any).catch(() => {})

      expect(mockLogger.info).toHaveBeenCalledWith('Deploying contract...', params)
    })

    it('should log info for executeContract', async () => {
      const params = {
        contractAddress: 'me1contract',
        msg: { increment: {} },
        sender: 'me1sender',
      }

      await service.executeContract(params).catch(() => {})

      expect(mockLogger.info).toHaveBeenCalledWith('Executing contract...', params)
    })
  })
})
