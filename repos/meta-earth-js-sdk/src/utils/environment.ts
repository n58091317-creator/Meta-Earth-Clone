import type { Environment } from '../types'

/**
 * Detect current running environment
 */
export function detectEnvironment(): Environment {
  if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
    return 'browser'
  }

  if (typeof process !== 'undefined' && process.versions != null && process.versions.node != null) {
    return 'node'
  }

  return 'unknown'
}

/**
 * Check if running in browser environment
 */
export function isBrowser(): boolean {
  return detectEnvironment() === 'browser'
}

/**
 * Check if running in Node.js environment
 */
export function isNode(): boolean {
  return detectEnvironment() === 'node'
}
