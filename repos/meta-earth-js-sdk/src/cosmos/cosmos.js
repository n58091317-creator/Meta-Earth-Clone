import * as bip39 from 'bip39'
import * as bip32 from 'bip32'
import * as bech32 from 'bech32'
import * as secp256k1 from 'secp256k1'
import message from './messages/proto'

export class Cosmos {
  constructor(chainId) {
    this.chainId = chainId
    this.path = "m/44'/118'/0'/0/0"
    this.bech32MainPrefix = 'me'
  }

  // strength(128): 12 words, strength(256): 24 words
  getRandomMnemonic(strength = 256) {
    return bip39.generateMnemonic(strength)
  }

  setBech32MainPrefix(prefix) {
    this.bech32MainPrefix = prefix
    if (!this.bech32MainPrefix) throw new Error('bech32MainPrefix object was not set or invalid')
  }

  setPath(value) {
    this.path = value
    if (!this.path) throw new Error('path object was not set or invalid')
  }

  getAddress(mnemonic, checkSum = true) {
    if (typeof mnemonic !== 'string') {
      throw new Error('mnemonic expects a string')
    }

    if (checkSum) {
      if (!bip39.validateMnemonic(mnemonic))
        throw new Error('mnemonic phrases have invalid checksums')
    }

    const seed = bip39.mnemonicToSeed(mnemonic)
    const node = bip32.fromSeed(seed)
    const child = node.derivePath(this.path)
    const words = bech32.toWords(child.identifier)
    return bech32.encode(this.bech32MainPrefix, words)
  }

  getECPairPriv(mnemonic) {
    if (typeof mnemonic !== 'string') {
      throw new Error('mnemonic expects a string')
    }

    const seed = bip39.mnemonicToSeed(mnemonic)
    const node = bip32.fromSeed(seed)
    const child = node.derivePath(this.path)

    return child.privateKey
  }

  getPubKeyAny(privateKey) {
    const pubKeyByte = secp256k1.publicKeyCreate(privateKey)
    const buf3 = Buffer.from(pubKeyByte)

    const pubKey = Buffer.concat([buf3])
    const pubKeyAny = new message.google.protobuf.Any({
      type_url: '/cosmos.crypto.secp256k1.PubKey',
      value: pubKey,
    })

    return pubKeyAny
  }
}
