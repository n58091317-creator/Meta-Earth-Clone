---
sidebar_position: 2
title: Account Details
---

# ME Account System Details

## Overview

The ME account system is the core identity management mechanism of the Meta Earth network, adopting Bech32 address format and standard mnemonic generation methods. This system combines the ME ID protocol to provide users with secure, compliant, and user-friendly account management services.

## ME Account Standards

### Bech32 Address Format

The ME network adopts the Bech32 address format, which is the standard address format for the ME ecosystem, featuring the following characteristics:

#### 1. Address Structure
An ME address consists of three parts: first, the human-readable prefix "me" representing Meta Earth; second, the separator "1"; finally, a character sequence obtained by Bech32 data part encoding of the public key hash (specific hash length determined by implementation).
```
me1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
│ │
│ └─ Public key hash (fixed-length byte sequence, specific length depends on implementation), encoded in Bech32 data part
└─ Prefix "me" (abbreviation of Meta Earth)
```

> Note: Although Bech32 and traditional Base32 both use 5-bit grouped data representation, they are different encoding schemes. Bech32 is designed for blockchain addresses, has built-in checksum, stronger error detection capabilities, and better human readability. Therefore, it is widely adopted in blockchain addresses (such as Cosmos series) rather than directly using Base32 encoding.

#### 2. Address Types
- **User Address**: Starts with `me1`, specifically for individual user account identification.
- **Validator Address**: Starts with `mevaloper1`, used to identify validator nodes at the consensus layer.
- **Contract Address**: Also starts with `me1`, assigned to smart contracts deployed on the network.

#### 3. Address Generation Process
In program implementation, address generation typically follows this process: first, use a cryptographically secure random number generator to produce a private key, then derive the corresponding public key through elliptic curve algorithm. Finally, hash the public key's raw data and perform Bech32 encoding with the specified "me" prefix to obtain a unique account address.

### Mnemonic Standards

The ME network adopts BIP39 standard mnemonic generation methods, supporting multiple languages:

#### 1. Mnemonic Length

- **12 words**: 128-bit entropy, recommended for regular users

#### 2. Mnemonic Generation Process
When generating an account, first generate random data based on the selected entropy length (such as 256 bits), converting it into a word list (mnemonic) that is easy for humans to remember. Then, convert the mnemonic into a binary seed through salted hashing algorithm, and build a hierarchical deterministic (HD) wallet based on that seed.

#### 3. Derivation Path
ME follows the BIP44 standard path for account derivation. The master private key undergoes layer-by-layer derivation, sequentially determining wallet protocol type (44'), coin type code (118' for ME-like chains), account index, chain marker distinguishing external or internal use, and final address index. This mechanism allows users to manage an unlimited number of sub-addresses with just one set of mnemonics.

### Private Key and Public Key Standards

#### 1. Private Key Standards
- **Algorithm**: Adopts industry-standard secp256k1 elliptic curve algorithm, ensuring extremely high security and cross-platform compatibility.
- **Characteristics**: Private keys have a fixed length of 32 bytes (256 bits), which can be represented as hexadecimal strings or raw binary format during storage and transmission.
- **Verification**: Valid private keys must strictly comply with length specifications and be generated from cryptographically secure random sources.

#### 2. Public Key Standards
- **Algorithm**: Also based on secp256k1 elliptic curve derivation.
- **Characteristics**: Supports 33-byte compressed format (recommended) or 65-byte uncompressed format. Public keys serve as public identity markers, used to verify the validity of user transaction signatures.

## Address Generation Methods

### 1. Programmatic Generation
Developers can implement automated account generation by integrating Go or JavaScript development kits. The core logic lies in calling underlying cryptographic libraries to generate asymmetric key pairs and encoding the public key hash into a string prefixed with "me". For Web environments, hierarchical deterministic wallet logic is typically utilized, obtaining account details including address, HEX-format public key, and private key through mnemonics and specific derivation paths (such as address index).

### 2. Command Line Tool Generation
 
#### Using med Command Line Tool
```bash
# Create new account
med keys add my-account --keyring-backend test

# Recover account from mnemonic (example)
# Input mnemonic through pipe to recover account, specifying HD path, coin type, and key type
echo "$user_mnemonic" | med keys add my-account --hd-path "m/44'/118'/0'/0/0/${user_index}" --coin-type 118 --key-type secp256k1 --keyring-backend test --recover

# View account information
med keys show my-account --keyring-backend test

# List all accounts
med keys list --keyring-backend test
```

#### Using Roller Tool
```bash
# Initialize Roller configuration
roller config init --interactive

# Generate sequencer account
roller sequencer init

# View account balance
roller balance
```

### 3. Wallet Application Generation

#### ME PASS Wallet
ME PASS is the official mobile wallet application launched by Meta Earth, providing complete lifecycle management functions: supports one-click creation of new accounts through SDK, importing existing mnemonics for account recovery, and provides secure signature services for various blockchain transactions. It is deeply integrated with the ME ID protocol, ensuring operational compliance.
Download link: https://www.mec.me/en-US/me-pass

#### Plugin Wallet Support
The ME network supports mainstream Web3 plugin wallets through a compatibility layer:
Plugin wallet Google Play Store download links are as follows:
https://chromewebstore.google.com/search/Meta%20Earth%20Wallet?hl=en&utm_source=ext_sidebar

## ME ID Protocol Integration

### 1. Identity Verification Process
The ME ID identity verification process encompasses ME ID data submission, backend verification logic, unique identity ID (ME ID) generation, and finally binding this identity to the user's on-chain address. This process ensures that the identity behind the account is traceable and compliant with regulatory requirements.

### 2. Account Permission Management
At the smart contract level, the system manages permissions through establishing a mapping table between addresses and ME IDs. Only users who pass identity verification will be granted specific permissions. Contract logic includes identity verification triggers, permission granting event recording, and real-time permission status queries, thereby implementing refined access control in decentralized applications.

## Account Security Best Practices

### 1. Private Key Management
- **Offline Storage**: Private keys should be stored on offline devices
- **Multi-signature**: Use multi-signature verification for important operations
- **Hardware Wallet**: Use hardware wallets to store high-value assets
- **Regular Backup**: Regularly backup mnemonics and private keys

### 2. Transaction Security
The system ensures transaction security through multiple verification mechanisms. First is format verification, ensuring that key fields such as sender, receiver, and amount are complete and accurate; second is business logic verification, such as ensuring transfer amount is greater than zero; finally is address legality verification, using Bech32 decoding to detect if the prefix is legitimate "me", thereby preventing sending assets to wrong networks or incorrectly formatted addresses.

### 3. Account Recovery Process
Account recovery is built on rigorous mnemonic verification logic. The process includes: first verifying if the mnemonic conforms to BIP39 dictionary specifications, then calculating the binary seed based on the mnemonic, and finally using hierarchical deterministic algorithms and preset derivation paths (such as coin type code 118 and user-specified address index) to recover the original private key, public key, and account address. This process does not depend on any centralized servers and is completely closed-loop by local logic.

Through this complete account system design, the ME network provides users with secure, convenient, and compliant account management services, supporting various needs from individual users to enterprise-level applications.
