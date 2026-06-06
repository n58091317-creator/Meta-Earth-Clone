/**
 * Browser polyfills for Node.js globals
 * Provide Node.js global objects polyfill for browser environment
 */

import { Buffer } from 'buffer'

// Ensure globalThis exists first (some older browsers may not support it)
if (typeof globalThis === 'undefined') {
  if (typeof window !== 'undefined') {
    ;(window as any).globalThis = window
  } else if (typeof global !== 'undefined') {
    ;(global as any).globalThis = global
  } else if (typeof self !== 'undefined') {
    ;(self as any).globalThis = self
  }
}

// Add Buffer to global scope in browser environment
if (typeof window !== 'undefined') {
  ;(window as any).Buffer = Buffer
  ;(window as any).global = window
}

// Ensure globalThis.Buffer exists
if (typeof globalThis !== 'undefined') {
  // @ts-ignore
  globalThis.Buffer = Buffer
}

export {}
