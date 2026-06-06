import { gas_adj, gas_price, gas_floatValue, gas_min_fee, gas_max_set } from '../config/define'
import BigNumber from 'bignumber.js'

/**
 * Calculate final gas fee
 * @param simulateGas Simulated gas
 * @param customGas Custom gas limit
 * @returns Final gas fee string
 */
export const getFinalGas = (simulateGas: string, customGas: string | number) => {
  debugger
  const newGas = (+simulateGas + 1000) * gas_adj
  const _newGas = Math.floor(newGas * gas_price + gas_floatValue)
  const _finalGas = BigNumber(customGas).isLessThan(_newGas) ? _newGas : customGas
  const gas_fee = BigNumber(_finalGas).isLessThan(gas_min_fee) ? gas_min_fee : _finalGas
  return gas_fee.toString()
}

/**
 * Calculate final gas
 * @param simulateGas Simulated gas
 * @param customGas Custom gas limit
 * @returns Final gas fee string
 */
export const getFinalGasLimit = (simulateGas: string) => {
  debugger
  const newGas = +simulateGas * 1.15
  const _newGas = Math.floor(newGas)
  const gas = BigNumber(_newGas).isLessThan(gas_max_set) ? gas_max_set : _newGas
  return gas.toString()
}

export default {}
