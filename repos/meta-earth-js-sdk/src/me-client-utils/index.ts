import { SigningStargateClient } from '@cosmjs/stargate'
import { chainIdName } from '../config/define'
import { TxRaw } from '../me-client-ts/cosmos.tx.v1beta1/types/cosmos/tx/v1beta1/tx'
import { WalletApi, TransactionApi, httpClient } from '../api'
import { Layer } from '../types'

/**
 * Handle TxRaw
 * @param paramsObj TxRaw
 * @returns Promise<{ tx_bytes: string }>
 */
export const handleTxRaw = (paramsObj: TxRaw) => {
  return new Promise<{ tx_bytes: string }>(async (resolve) => {
    // Use encode method to encode TxRaw to protobuf bytes
    const txRawBytes = TxRaw.encode(paramsObj).finish()
    // Convert Uint8Array to base64 string for JSON serialization
    const base64 = Buffer.from(txRawBytes).toString('base64')
    resolve({ tx_bytes: base64 })
  })
}

/**
 * Get simulated gas
 * @param params { tx_bytes: string }
 * @returns { gasUsed: number }
 */
export const getSimulateGas: (params: any) => Promise<any> = (params) => {
  return new Promise(async (resolve) => {
    try {
      let simulateGasRes = await new TransactionApi(httpClient).simulateGas(params)
      resolve({ gasUsed: simulateGasRes.gas_info.gas_used })
    } catch (error) {
      console.log('getSimulateGas:', error)
      resolve({ result: false })
    }
  })
}

/**
 * Get sign data parameters
 */
interface getSignDataParams {
  signingClient: SigningStargateClient
  address: string
  msg: any
  fee: any
  memo?: string
  layer?: Layer
  chainId?: string
}

export const getSignData: (
  params: getSignDataParams,
) => Promise<{ result: boolean; rowRes?: TxRaw }> = (params) => {
  return new Promise<{ result: boolean; rowRes?: TxRaw }>(async (resolve) => {
    try {
      debugger
      let { signingClient, address, msg, fee, memo, layer = 'hub', chainId = '' } = params
      let chainInfo = await new WalletApi(httpClient).getAccountInfo(address, layer)

      const account = chainInfo.account
      if (!account) throw Error('Account info not found')

      // Cross-chain transaction chainId needs to be passed according to the specific chain
      let rowRes = await signingClient.sign(address, [msg], fee, memo || '', {
        accountNumber: account.account_number,
        sequence: account.sequence,
        chainId: chainId || chainIdName,
      })

      resolve({ result: true, rowRes })
    } catch (error) {
      console.log('getSignData:', error)
      resolve({ result: false })
    }
  })
}

export default {}
