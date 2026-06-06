---
sidebar_position: 5
title: Account Model
---

# ME Earth Account Model

## Overview

ME Hub adopts a hybrid account model that is compatible with both Bech32 address format, while extending unique features such as Decentralized Identity (DID) and regional accounts. This document provides a detailed introduction to ME Hub's account types, address formats, account management, and usage methods.

## Account System Architecture

ME Hub's account system includes multiple account types, forming a complete account ecosystem:

```
ME Hub Account System
    |
    ├── User Account
    |
    ├── Module Account
    |   ├── mint module
    |   ├── staking module
    |   ├── gov module
    |   ├── treasury module
    |   └── Other module accounts...
    |
    ├── Contract Account
    |   └── WASM Contract
    |
    └── Validator Node Address
        ├── Validator Operator Address
        └── Consensus Node Address
```

## Address Prefix Configuration

ME Hub uses a unified address prefix system, with all addresses starting with `me`. At the system level, we configure standardized display units, base precision units (e.g., 1 MEC equals 100,000,000 umec), and globally unique account prefixes.

To distinguish accounts of different roles, the system routes through different Bech32 prefixes. In addition to basic user accounts, validator operator prefix (mevaloper), consensus node prefix (mevalcons), and corresponding public key prefixes are defined.

In address validation logic, the system enforces strict verification rules. Addresses cannot be empty, and their byte length must comply with specifications (typically 20 or 32 bytes, not exceeding the system maximum). This design ensures account security and effectively prevents fund loss due to incorrect addresses.

### Address Prefix Table

| Account Type | Address Prefix | Public Key Prefix | Example |
|:------------|:--------------|:-----------------|:--------|
| User Account | `me` | `mepub` | `me1abc...xyz` |
| Validator Account | `mevaloper` | `mevaloperpub` | `mevaloper1abc...xyz` |
| Consensus Node | `mevalcons` | `mevalconspub` | `mevalcons1abc...xyz` |
| WASM Contract | `me` | - | `me1contract...xyz` |

## Account Type Details

### 1. User Account

User accounts are the most basic account type, used for storing tokens and initiating transactions.

#### ME Account

ME Hub's user accounts adopt standard Bech32 encoding format, with addresses prefixed by `me`. A typical address length is usually 20 or 32 bytes, consisting of a prefix, separator "1", and Base32-encoded sequence based on public key hash. This structure makes addresses highly readable and, through built-in checksum mechanism, effectively prevents input errors, ensuring perfect compatibility with the ME ecosystem.

### 2. Module Account

Module accounts are special system accounts used to manage module funds and permissions.
For module account list, see the explorer formula page: https://explorer.mec.me/en-US/formula

#### Module Account List

ME Hub contains a series of core module accounts that perform specific system functions. For example, the fee collector aggregates network-wide transaction fees, the mint module is responsible for producing new tokens, and the staking pool manages all bonded and unbonded staking assets. Additionally, governance, MBC transfer, sequencer, and WASM modules also have independent system accounts.

#### Module Account Characteristics

**Address Generation and Permissions**:
These account addresses are fixed and generated through hashing of module names. The system defines rigorous permission sets for each module, such as `Minter` (minting), `Burner` (burning), and `Staking` (staking) permissions. Some accounts (like treasury pool) are limited to holding tokens only.

Operations personnel and developers can query the detailed list of network-wide module accounts in real-time through CLI commands, as well as token balances under each dedicated account.

### 3. Contract Account

ME Hub supports two smart contract systems:

#### 3.1 WASM Smart Contract

WASM contract addresses use unified Bech32 encoding, with prefix `me`. The contract entry process logic is clear: first store the compiled bytecode to generate a code ID, then instantiate with specific initialization messages and administrative permissions, and finally generate a unique contract address through a derivation algorithm.

### 4. Validator Node Address

Validator nodes use two different types of addresses:

#### 4.1 Validator Operator Address

**Address Properties and Prefix**:
The validator operator address Bech32 prefix is `mevaloper`. This address is the validator's management identity, generated through byte-level format conversion of the user account address.

**Main Functions**:
This address bears the "lifecycle management" responsibility for validators, including node initialization and creation, receiving token delegations from the community, and dynamically modifying key parameters such as commission rates or website information.

**Validator Creation Core Logic**:
During validator creation, the system first strictly verifies the submitted public key type (such as Ed25519 or Secp256k1) and initializes validator metadata based on that public key. Meanwhile, through rigorous calculation models, the system sets commission strategies, including initial execution rate, maximum allowed rate ceiling, and hard limits on daily rate fluctuation.

At the execution level, the system establishes a strong association between validators and owner addresses, incorporating them into a multi-level weight index system. Even if validators are not yet active, their basic information is persisted to storage and automatically triggers subsequent staking and state machine transition hooks, guiding nodes from "unbonded" status to gradually transition to "bonded" status.

#### 4.2 Consensus Node Address

**Prefix and Attribution**:
The consensus node address is prefixed with `mevalcons`. It is the validator's technical identity when participating in underlying block production and voting. Unlike the logical address used for management, this address is typically derived from the consensus private key (rather than account private key).

**Core Functions**:
This address is mainly used for fine-grained data tracking in the consensus network. The system records validators' signing activity, detects whether there is double signing (Double Sign) or other violations, and periodically updates validators' signing information (Signing Info). Through this design, the system can identify in real-time and proactively jail consensus nodes that perform poorly or have malicious intent, ensuring overall network stability and security.

---

**Document Version**: v2.0.0  
**Last Updated**: 2026-02-09  
**Maintainer**: Meta Earth Development Team
