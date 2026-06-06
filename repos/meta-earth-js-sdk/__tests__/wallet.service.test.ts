import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Mock } from 'vitest'
import { WalletService } from '../src/modules/wallet/service'
import { Logger } from '../src/utils/logger'
import { HttpClient } from '../src/utils/http-client'
import { WalletApi } from '../src/api/wallet'

const testMnemonic = `must utility suit notable parade author bone near blush design dream duck`
const testPriv = `2b522b5191b5ed1420abfdc860146aecbe086f4397179aac28acbc9ab7eff5c7`
const testAddress = `me1ec50cpu4rwwpr2thku5hrhksxvkcdah3y95ehj`
const test0xAddress = `0xce28fc07951b9c11a977b72971ded0332d86f6f1`

describe('WalletService', () => {
  let service: WalletService
  let mockLogger: Logger
  let mockEnsureInitialized: Mock<() => void>

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      setEnabled: vi.fn(),
      enabled: false,
    } as any

    mockEnsureInitialized = vi.fn()

    const mockHttpClient = {
      get: vi.fn().mockResolvedValue({ data: {} }),
      post: vi.fn().mockResolvedValue({ data: {} }),
    } as any

    const mockApi = new WalletApi(mockHttpClient)

    service = new WalletService({
      logger: mockLogger,
      wallets: new Map(),
      ensureInitialized: mockEnsureInitialized,
      api: mockApi,
    })
  })

  describe('createMnemonicWallet', () => {
    it('should create wallet with provided mnemonic', async () => {
      // Input - use the predefined test constant
      console.log('[Test Input] createMnemonicWallet with mnemonic:', testMnemonic)

      // Execute
      const result = await service.createMnemonicWallet(testMnemonic)

      // Output
      console.log('[Test Output] createMnemonicWallet result:', {
        mnemonic: result.mnemonic,
        address: result.address,
        mnemonicLength: result.mnemonic.length,
        addressLength: result.address.length,
        matchExpected: result.mnemonic === testMnemonic,
      })

      // Assertions
      expect(result).toHaveProperty('mnemonic')
      expect(result).toHaveProperty('address')
      expect(typeof result.address).toBe('string')
      expect(result.address).toMatch(/^me1/) // The implementation currently uses the me1 prefix
      expect(result.mnemonic).toBe(testMnemonic) // It should return the same mnemonic
    })

    it('should create different wallets for different indices', async () => {
      const result0 = await service.createMnemonicWallet(testMnemonic, 0)
      const result1 = await service.createMnemonicWallet(testMnemonic, 1)

      expect(result0.address).not.toBe(result1.address)
      expect(result0.mnemonic).toBe(result1.mnemonic)
      expect(result0.index).toBe(0)
      expect(result1.index).toBe(1)
    })

    it('should call ensureInitialized', async () => {
      console.log('[Test] createMnemonicWallet - checking ensureInitialized call')

      await service.createMnemonicWallet()

      console.log(
        '[Test Output] ensureInitialized called:',
        mockEnsureInitialized.mock.calls.length,
        'times',
      )
      expect(mockEnsureInitialized).toHaveBeenCalled()
    })
  })

  describe('addAccount', () => {
    it('should add account with specific index', async () => {
      const result = await service.addAccount(testMnemonic, 5)

      expect(result.index).toBe(5)
      expect(result.address).toMatch(/^me1/)

      // Verify that it is stored in the wallets map
      const storedWallet = service['wallets'].get(result.address)
      expect(storedWallet).toBeDefined()
      expect(storedWallet?.index).toBe(5)
    })
  })

  describe('batchCreateWallets', () => {
    it('should batch create multiple wallets', async () => {
      const count = 5
      const result = await service.batchCreateWallets(testMnemonic, count)

      expect(result.length).toBe(count)
      expect(result[0].index).toBe(0)
      expect(result[count - 1].index).toBe(count - 1)
      expect(result[0].mnemonic).toBe(testMnemonic)

      // Verify that all addresses are unique
      const addresses = result.map((w) => w.address)
      const uniqueAddresses = new Set(addresses)
      expect(uniqueAddresses.size).toBe(count)

      // Verify that they are stored in the wallets map
      expect(service['wallets'].size).toBeGreaterThanOrEqual(count)
    })

    it('should batch create wallets with start index', async () => {
      const count = 3
      const startIndex = 10
      const result = await service.batchCreateWallets(testMnemonic, count, startIndex)

      expect(result.length).toBe(count)
      expect(result[0].index).toBe(startIndex)
      expect(result[result.length - 1].index).toBe(startIndex + count - 1)
    })
  })

  describe('createPrivateKeyWallet', () => {
    it('should create wallet from private key', async () => {
      const result = await service.createPrivateKeyWallet(testPriv)

      expect(result).toHaveProperty('address')
      expect(typeof result.address).toBe('string')
      expect(result.address).toMatch(/^me1/)
      expect(result.address).toBe(testAddress) // It should match the predefined test address
    })

    it('should throw error if private key is invalid', async () => {
      await expect(service.createPrivateKeyWallet('invalid')).rejects.toThrow()
    })

    it('should accept private key with 0x prefix', async () => {
      const result = await service.createPrivateKeyWallet(`0x${testPriv}`)

      expect(result.address).toBe(testAddress)
    })
  })

  describe('importWallet', () => {
    it('should import wallet from mnemonic', async () => {
      // Input - use the predefined test constant
      console.log('[Test Input] importWallet with mnemonic:', testMnemonic)

      // Execute
      const result = await service.importWallet({ mnemonic: testMnemonic })

      // Output
      console.log('[Test Output] importWallet result:', {
        address: result.address,
        addressType: typeof result.address,
        addressLength: result.address?.length,
      })

      expect(result).toHaveProperty('address')
      expect(typeof result.address).toBe('string')
    })

    it('should import wallet from private key', async () => {
      const result = await service.importWallet({ privateKey: testPriv })

      expect(result).toHaveProperty('address')
      expect(typeof result.address).toBe('string')
    })

    it('should throw error if neither mnemonic nor private key provided', async () => {
      await expect(service.importWallet({})).rejects.toThrow()
    })
  })

  describe('exportWallet', () => {
    beforeEach(() => {
      const wallets = new Map()
      wallets.set(testAddress, {
        mnemonic: testMnemonic,
        privateKey: testPriv,
      })
      const mockHttpClient = {
        get: vi.fn().mockResolvedValue({ data: {} }),
        post: vi.fn().mockResolvedValue({ data: {} }),
      } as any

      const mockApi = new WalletApi(mockHttpClient)

      service = new WalletService({
        logger: mockLogger,
        wallets,
        ensureInitialized: mockEnsureInitialized,
        api: mockApi,
      })
    })

    it('should export wallet data', async () => {
      // Input
      console.log('[Test Input] exportWallet with address:', testAddress)

      // Execute
      const result = await service.exportWallet(testAddress)

      // Output
      console.log('[Test Output] exported wallet data:', {
        hasMnemonic: !!result.mnemonic,
        hasPrivateKey: !!result.privateKey,
        mnemonicLength: result.mnemonic?.length,
        privateKeyLength: result.privateKey?.length,
      })

      // Assertions
      expect(result).toHaveProperty('mnemonic', testMnemonic)
      expect(result).toHaveProperty('privateKey', testPriv)
      expect(result.mnemonic).toBe(testMnemonic)
      expect(result.privateKey).toBe(testPriv)
    })

    it('should throw error if wallet not found', async () => {
      const unknownAddress = 'me1unknown99999999999999999999999999999'
      console.log('[Test Input] exportWallet with unknown address:', unknownAddress)

      await expect(service.exportWallet(unknownAddress)).rejects.toThrow('Wallet not found')
    })
  })

  describe('convert0xToMeAddress', () => {
    it('should convert 0x address to ME address', () => {
      // Input - convert the predefined test0xAddress to an ME address
      console.log('[Test Input] convert0xToMeAddress with:', test0xAddress)

      // Execute
      const result = service.convert0xToMeAddress(test0xAddress)

      // Output
      console.log('[Test Output] converted ME address:', result)

      // Assertions
      expect(result).toMatch(/^me1/)
      expect(result).not.toContain('0x')
      expect(result.length).toBeGreaterThan(10)
      expect(result).toBe(testAddress) // It should match the predefined test address
    })

    it('should throw error for invalid hex address', () => {
      const invalidAddress = 'invalid'
      console.log('[Test Input] convert0xToMeAddress with invalid:', invalidAddress)

      expect(() => service.convert0xToMeAddress(invalidAddress)).toThrow()
    })
  })

  describe('convertMeTo0xAddress', () => {
    it('should convert ME address to 0x address', () => {
      // Input - use the predefined test address
      console.log('[Test Input] convertMeTo0xAddress with test address:', testAddress)

      // Convert back to 0x
      const result = service.convertMeTo0xAddress(testAddress)

      // Output
      console.log('[Test Output] converted back to 0x:', result)

      // Assertions
      expect(result).toMatch(/^0x/)
      expect(result.length).toBe(42) // 0x + 40 hex characters
      expect(result).toBe(test0xAddress) // It should match the predefined test0xAddress
    })

    it('should throw error for invalid ME address', () => {
      const invalidAddress = 'invalid'
      console.log('[Test Input] convertMeTo0xAddress with invalid:', invalidAddress)

      expect(() => service.convertMeTo0xAddress(invalidAddress)).toThrow()
    })
  })

  describe('getWalletAddresses', () => {
    it('should return all wallet addresses', () => {
      // Create a map that contains multiple wallets
      const wallets = new Map()
      wallets.set(testAddress, { mnemonic: testMnemonic, privateKey: testPriv })
      wallets.set('me1abc123def456', {
        mnemonic: 'another test mnemonic',
        privateKey: 'another-key',
      })

      const mockHttpClient = {
        get: vi.fn().mockResolvedValue({ data: {} }),
        post: vi.fn().mockResolvedValue({ data: {} }),
      } as any

      const mockApi = new WalletApi(mockHttpClient)

      service = new WalletService({
        logger: mockLogger,
        wallets,
        ensureInitialized: mockEnsureInitialized,
        api: mockApi,
      })

      const result = service.getWalletAddresses()

      // Output
      console.log('[Test Output] getWalletAddresses result:', result)

      // Assertions
      expect(result).toContain(testAddress)
      expect(result).toContain('me1abc123def456')
      expect(result.length).toBe(2)
    })

    it('should return empty array if no wallets', () => {
      const result = service.getWalletAddresses()

      // Output
      console.log('[Test Output] getWalletAddresses (empty):', result)

      // Assertions
      expect(result).toEqual([])
      expect(result.length).toBe(0)
      expect(Array.isArray(result)).toBe(true)
    })
  })
})
