import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HttpClient } from '../src/utils/http-client'
import { GovernanceApi } from '../src/api/governance'
import { StakingApi } from '../src/api/staking'
import { TransactionApi } from '../src/api/transaction'

vi.mock('../src/me-client-ts/cosmos.gov.v1beta1/module', () => ({
  txClient: () => ({
    sendMsgSubmitProposal: vi.fn().mockResolvedValue({ tx_bytes: 'proposal-bytes' }),
    sendMsgVote: vi.fn().mockResolvedValue({ tx_bytes: 'vote-bytes' }),
  }),
}))

vi.mock('../src/me-client-ts/cosmos.staking.v1beta1/module', () => ({
  txClient: () => ({
    sendMsgUndelegate: vi.fn().mockResolvedValue({ tx_bytes: 'undelegate-bytes' }),
  }),
}))

vi.mock('../src/me-client-ts/metaearth.wstaking/module', () => ({
  txClient: () => ({
    sendMsgWithdrawDelegatorReward: vi.fn().mockResolvedValue({ tx_bytes: 'reward-bytes' }),
  }),
}))

describe('API layer propagation', () => {
  const signer = {
    getAccounts: vi.fn().mockResolvedValue([{ address: 'me1test' }]),
  } as any

  let httpClient: HttpClient

  beforeEach(() => {
    httpClient = {
      get: vi.fn(),
      post: vi.fn(),
      setLayer: vi.fn(),
      setNetworkConfig: vi.fn(),
    } as any

    vi.spyOn(TransactionApi.prototype, 'sendTransaction').mockResolvedValue({
      tx_response: { txhash: '0xhash' },
    } as any)
  })

  it('should pass proposal layer to transaction broadcast', async () => {
    const api = new GovernanceApi(httpClient)

    await api.createSoftwareUpgradeProposal(
      {
        proposer: 'me1proposer',
        initialDeposit: [{ amount: '1000', denom: 'umec' }],
        content: {
          title: 'Upgrade',
          description: 'Upgrade network',
          plan: {
            name: 'v2',
            height: '100',
          },
        },
        layer: 'rollup',
      },
      signer,
    )

    expect(TransactionApi.prototype.sendTransaction).toHaveBeenCalledWith(
      'proposal-bytes',
      'rollup',
    )
  })

  it('should pass vote layer to transaction broadcast', async () => {
    const api = new GovernanceApi(httpClient)

    await api.voteProposal(
      {
        proposalId: 1,
        voter: 'me1voter',
        option: 'yes',
        layer: 'rollup',
      },
      signer,
    )

    expect(TransactionApi.prototype.sendTransaction).toHaveBeenCalledWith(
      'vote-bytes',
      'rollup',
    )
  })

  it('should pass undelegation layer to transaction broadcast', async () => {
    const api = new StakingApi(httpClient)

    await api.createUndelegation('me1delegator', { amount: '10', denom: 'umec' }, 'rollup', signer)

    expect(TransactionApi.prototype.sendTransaction).toHaveBeenCalledWith(
      'undelegate-bytes',
      'rollup',
    )
  })

  it('should pass reward claim layer to transaction broadcast', async () => {
    const api = new StakingApi(httpClient)

    await api.createWithdrawDelegatorReward('me1delegator', 'rollup', signer)

    expect(TransactionApi.prototype.sendTransaction).toHaveBeenCalledWith(
      'reward-bytes',
      'rollup',
    )
  })
})
