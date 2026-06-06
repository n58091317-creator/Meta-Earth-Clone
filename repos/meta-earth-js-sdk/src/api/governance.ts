/**
 * Governance API Methods
 * Governance related API interface methods
 */

import { HttpClient } from '../utils/http-client'
import type { Layer, ProposalParams, SoftwareUpgradeProposalMsg, VoteParams } from '../types'
import type { Proposal, ProposalStatus } from './types'
import { txClient as govClient } from '../me-client-ts/cosmos.gov.v1beta1/module'
import { PREFIX } from '../config/define'
import { OfflineSigner } from '@cosmjs/proto-signing'
import { TransactionApi } from './transaction'

export class GovernanceApi {
  constructor(private httpClient: HttpClient) {}

  /**
   * Create governance proposal
   * @param params Proposal parameters
   * @param signer Signer object
   * @returns Promise<string> Transaction hash
   */
  public async createSoftwareUpgradeProposal(
    params: ProposalParams,
    signer: OfflineSigner,
  ): Promise<string> {
    try {
      const { layer = 'hub' } = params
      const msgValue: SoftwareUpgradeProposalMsg = {
        content: params.content,
        initialDeposit: params.initialDeposit,
        proposer: params.proposer,
      }

      // Create txClient and send transaction
      const client = govClient({ signer, prefix: PREFIX })
      const { tx_bytes } = await client.sendMsgSubmitProposal({
        value: msgValue,
        memo: params.memo || '',
      })

      const response = await new TransactionApi(this.httpClient).sendTransaction(tx_bytes, layer)

      return response.tx_response.txhash
    } catch (error) {
      console.error('Failed to create proposal:', error)
      throw error
    }
  }

  /**
   * Vote for proposal
   * @param proposalId Proposal ID
   * @param voter Voter address
   * @param option Vote option ('yes' | 'no' | 'abstain' | 'no_with_veto')
   * @param layer Target layer (default 'hub')
   * @param metadata Additional metadata
   * @returns Promise<string> Transaction hash
   */
  public async voteProposal(params: VoteParams, signer: OfflineSigner): Promise<string> {
    try {
      const { layer = 'hub' } = params
      // Map vote option string to VoteOption enum
      const voteOptionMap: Record<string, number> = {
        yes: 1, // VOTE_OPTION_YES
        abstain: 2, // VOTE_OPTION_ABSTAIN
        no: 3, // VOTE_OPTION_NO
        no_with_veto: 4, // VOTE_OPTION_NO_WITH_VETO
      }

      const option = voteOptionMap[params.option] || 0

      // Build MsgVote message (v1beta1 format - no metadata field)
      const msgValue = {
        proposalId: params.proposalId,
        voter: params.voter,
        option,
      }

      // Create txClient and send transaction
      const client = govClient({ signer, prefix: PREFIX, addr: '' })
      const { tx_bytes } = await client.sendMsgVote({
        value: msgValue,
        memo: '',
      })

      const response = await new TransactionApi(this.httpClient).sendTransaction(tx_bytes, layer)

      return response.tx_response.txhash
    } catch (error) {
      console.error('Failed to vote proposal:', error)
      throw error
    }
  }

  /**
   * Get proposal list (V1)
   * @param status Proposal status filter
   * @param layer Target layer (default 'hub')
   * @returns Promise<PaginatedResponse<Proposal>>
   */
  public async getProposalsV1(
    status?: ProposalStatus,
    layer: Layer = 'hub',
  ): Promise<{ proposals: Proposal[] }> {
    try {
      const params: any = {}
      if (status) {
        params.proposal_status = status
      }

      const response = await this.httpClient.get('/cosmos/gov/v1/proposals', { params, layer })

      return response.data as { proposals: Proposal[] }
    } catch (error) {
      console.error('Failed to get proposals v1:', error)
      throw error
    }
  }
}
