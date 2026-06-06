import { CHAIN_ID, PREFIX } from '../config/define'
import { Cosmos } from '../cosmos/cosmos.js'

/**
 * Create Cosmos instance
 * @param index Address index
 * @returns Cosmos instance
 */
export const instanceME = (index: number) => {
  const instance = new Cosmos(CHAIN_ID)
  instance.setBech32MainPrefix(PREFIX)
  instance.setPath(`m/44'/118'/0'/0/${index}`)
  return instance
}
