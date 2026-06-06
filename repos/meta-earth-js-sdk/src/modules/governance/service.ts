/**
 * Governance Module Service
 * Governance module service - Handles all governance related operations
 */

import { Logger } from '../../utils/logger'
import { HttpClient } from '../../utils/http-client'
import { GovernanceApi } from '../../api/governance'
import type { ProposalParams, VoteParams, Layer } from '../../types'
import { Proposal, ProposalStatus } from '../../api/types'
import { WalletService } from '../wallet/service'

/**
 * Governance Service Class
 * Encapsulates all governance related operations
 */
export class GovernanceService {
  private logger: Logger
  private httpClient: HttpClient
  private api: GovernanceApi
  private walletService: WalletService
  private ensureInitialized: () => void

  constructor(
    logger: Logger,
    httpClient: HttpClient,
    walletService: WalletService,
    ensureInitialized: () => void,
  ) {
    this.logger = logger
    this.httpClient = httpClient
    this.walletService = walletService
    this.ensureInitialized = ensureInitialized
    this.api = new GovernanceApi(this.httpClient)
  }

  /**
   * Submit proposal (SoftwareUpgradeProposal)
   * @param params - Proposal parameters (proposer, content, initialDeposit, layer)
   * @returns Promise<string> Transaction hash
   * @throws Error if required parameters are missing
   */
  public async submitSoftwareUpgradeProposal(params: ProposalParams): Promise<string> {
    this.ensureInitialized()

    try {
      this.logger.info('Submitting SoftwareUpgradeProposal...', params)

      // Validate all required parameters
      const { proposer, content } = params
      const missingFields: string[] = []

      if (!proposer) missingFields.push('proposer')
      if (!content?.title) missingFields.push('content.title')
      if (!content?.description) missingFields.push('content.description')
      if (!content?.plan) missingFields.push('content.plan')
      if (!content?.plan?.name) missingFields.push('content.plan.name')
      if (!content?.plan?.height) missingFields.push('content.plan.height')

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
      }

      // Get signer
      const signer = await this.walletService.createDirectSecp256k1Wallet({
        address: proposer,
      })

      return await this.api.createSoftwareUpgradeProposal(params, signer)
    } catch (error: any) {
      this.logger.error('Failed to submit proposal:', error)
      throw error
    }
  }

  /**
   * Vote for proposal
   * @param params - Vote parameters (proposalId, voter, option, layer, metadata)
   * @returns Promise<string> Transaction hash
   * @throws Error if required parameters are missing
   */
  public async voteProposal(params: VoteParams): Promise<string> {
    this.ensureInitialized()

    try {
      this.logger.info('Voting on proposal...', params)

      // Validate parameters
      if (!params.proposalId || !params.voter || !params.option) {
        throw new Error('proposalId, voter, and option are required')
      }

      // Get signer
      const signer = await this.walletService.createDirectSecp256k1Wallet({
        address: params.voter,
      })

      return await this.api.voteProposal(params, signer)
    } catch (error: any) {
      this.logger.error('Failed to vote on proposal:', error)
      throw error
    }
  }

  /**
   * Get proposal list
   * @param status Proposal status filter
   * @param layer Target layer (default 'hub')
   * @returns Promise<Proposal[]> Proposal list
   */
  public async getProposals(status?: ProposalStatus, layer: Layer = 'hub'): Promise<Proposal[]> {
    this.ensureInitialized()
    try {
      this.logger.info('Getting proposals...', status)
      const response = await this.api.getProposalsV1(status, layer)
      return response.proposals
    } catch (error: any) {
      this.logger.error('Failed to get proposals:', error)
      throw error
    }
  }
}
