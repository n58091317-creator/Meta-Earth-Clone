import { beforeEach, describe, expect, it, vi } from 'vitest'
import { httpClient } from '../src/utils/http-client'
import { TransactionApi } from '../src/api/transaction'
import { StakingApi } from '../src/api/staking'
import { GovernanceApi } from '../src/api/governance'
import { ContractApi } from '../src/api/contract'
import { WalletApi } from '../src/api/wallet'

vi.mock('../src/utils/http-client', () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    setNetworkConfig: vi.fn(),
    setLayer: vi.fn(),
  },
}))

vi.mock('../src/me-client-ts/cosmos.bank.v1beta1/module', () => ({
  txClient: () => ({
    sendMsgSend: vi.fn().mockResolvedValue({ tx_bytes: 'mock_tx_bytes' }),
  }),
}))

vi.mock('../src/me-client-ts/cosmos.staking.v1beta1/module', () => ({
  txClient: () => ({
    sendMsgDelegate: vi.fn().mockResolvedValue({ tx_bytes: 'mock_tx_bytes' }),
  }),
}))

describe('API Methods', () => {
  let transactionApi: TransactionApi
  let stakingApi: StakingApi
  let governanceApi: GovernanceApi
  let contractApi: ContractApi
  let walletApi: WalletApi

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    transactionApi = new TransactionApi(httpClient)
    stakingApi = new StakingApi(httpClient)
    governanceApi = new GovernanceApi(httpClient)
    contractApi = new ContractApi(httpClient)
    walletApi = new WalletApi(httpClient)
  })

  describe('Wallet API', () => {
    it('should get balance successfully', async () => {
      const mockBalances = [{ amount: '1000', denom: 'umec' }]
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: { balances: mockBalances, pagination: { total: '1' } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      })

      const result = await walletApi.getBalance('me1test')

      expect(httpClient.get).toHaveBeenCalledWith('/cosmos/bank/v1beta1/balances/me1test', {
        layer: 'hub',
      })
      expect(result).toEqual(mockBalances)
    })

    it('should handle get balance error', async () => {
      vi.mocked(httpClient.get).mockRejectedValueOnce(new Error('Network error'))

      await expect(walletApi.getBalance('me1test')).rejects.toThrow('Network error')
    })
  })

  describe('Transaction API', () => {
    it('should send transfer successfully', async () => {
      vi.mocked(httpClient.post).mockResolvedValueOnce({
        data: { tx_response: { txhash: '0x1234567890abcdef' } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      })

      const result = await transactionApi.sendTransfer(
        {
          fromAddress: 'me1sender',
          toAddress: 'me1receiver',
          amount: [{ amount: '100', denom: 'umec' }],
        },
        {
          getAccounts: vi.fn().mockResolvedValue([{ address: 'me1sender' }]),
        } as any,
      )

      expect(result).toBe('0x1234567890abcdef')
    })

    it('should get transaction details successfully', async () => {
      const mockTransaction = {
        hash: '0x1234567890abcdef',
        height: '12345',
        timestamp: '2023-01-01T00:00:00Z',
      }

      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: mockTransaction,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      })

      const result = await transactionApi.getTransaction('0x1234567890abcdef')

      expect(httpClient.get).toHaveBeenCalledWith('/cosmos/tx/v1beta1/txs/0x1234567890abcdef', {
        params: {},
        layer: 'hub',
      })
      expect(result).toEqual(mockTransaction)
    })

    it('should get network fees successfully', async () => {
      const mockFees = {
        low: 0.01,
        medium: 0.02,
        high: 0.03,
        baseFee: '1000',
        gasPrice: '2000',
      }

      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: mockFees,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      })

      const result = await transactionApi.getNetworkFees()

      expect(httpClient.get).toHaveBeenCalledWith('/api/v1/network/fees', {
        params: {},
        layer: 'hub',
      })
      expect(result).toEqual(mockFees)
    })
  })

  describe('Staking API', () => {
    it('should create delegation successfully', async () => {
      vi.mocked(httpClient.post).mockResolvedValueOnce({
        data: { tx_response: { txhash: '0xabcdef1234567890' } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      })

      const result = await stakingApi.createDelegation(
        {
          address: 'me1delegator',
          amount: { amount: '1000', denom: 'umec' },
          layer: 'hub',
        },
        {
          getAccounts: vi.fn().mockResolvedValue([{ address: 'me1delegator' }]),
        } as any,
      )

      expect(result).toBe('0xabcdef1234567890')
    })
  })

  describe('Governance API', () => {
    it('should get proposals successfully', async () => {
      const mockProposals = [{ id: '1', title: 'Upgrade' }]

      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: { proposals: mockProposals },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      })

      const result = await governanceApi.getProposalsV1('PROPOSAL_STATUS_VOTING_PERIOD' as any)

      expect(httpClient.get).toHaveBeenCalledWith('/cosmos/gov/v1/proposals', {
        params: {
          proposal_status: 'PROPOSAL_STATUS_VOTING_PERIOD',
        },
        layer: 'hub',
      })
      expect(result).toEqual({ proposals: mockProposals })
    })
  })

  describe('Contract API', () => {
    it('should get contracts by code id successfully', async () => {
      const mockContracts = {
        contracts: ['me1contract'],
        pagination: { total: '1' },
      }

      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: mockContracts,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      })

      const result = await contractApi.getContractsByCodeId(1)

      expect(httpClient.get).toHaveBeenCalledWith('/cosmwasm/wasm/v1/code/1/contracts', {
        params: {},
        layer: 'hub',
      })
      expect(result).toEqual(mockContracts)
    })

    it('should query contract smart successfully', async () => {
      const mockQueryResult = { data: { balance: '1000' } }
      const queryMsg = { balance: { address: 'me1user' } }
      const queryBase64 = Buffer.from(JSON.stringify(queryMsg)).toString('base64')

      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: mockQueryResult,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      })

      const result = await contractApi.queryContractSmart('me1contract', queryMsg)

      expect(httpClient.get).toHaveBeenCalledWith(
        `/cosmwasm/wasm/v1/contract/me1contract/smart/${queryBase64}`,
        {
          params: {},
          layer: 'hub',
        },
      )
      expect(result).toEqual(mockQueryResult)
    })
  })

  describe('HTTP Client', () => {
    it('should handle network errors gracefully', async () => {
      vi.mocked(httpClient.get).mockRejectedValueOnce(new Error('Network error'))

      await expect(walletApi.getBalance('me1test')).rejects.toThrow('Network error')
    })

    it('should include layer parameter in all requests', async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: { balances: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      })

      await walletApi.getBalance('me1test', 'rollup')

      expect(httpClient.get).toHaveBeenCalledWith('/cosmos/bank/v1beta1/balances/me1test', {
        layer: 'rollup',
      })
    })
  })
})
