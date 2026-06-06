declare module 'bech32' {
  export function decode(str: string, limit?: number): { prefix: string; words: number[] }
  export function encode(prefix: string, words: number[], limit?: number): string
  export function toWords(bytes: ArrayLike<number> | Buffer): number[]
  export function fromWords(words: number[]): number[]
}
