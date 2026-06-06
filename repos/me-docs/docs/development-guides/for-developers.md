---
sidebar_position: 1
title: For Developers
---

# ME Hub Development Guide

ME Hub is compatible with WASM virtual machine, supporting developers to write smart contracts using multiple high-level languages. This document helps developers quickly develop, deploy, debug contracts on the ME Hub network, and develop various DApp applications based on contracts.

## What is a DApp?

DApp (Decentralized Application) is a decentralized application built on blockchain. On ME Hub, DApps can utilize the following features:

- **Dual Virtual Machine Support**: WASM, meeting different development needs
- **Cross-Chain Capabilities**: Cross-chain interaction through MBC protocol
- **Decentralized Identity**: Integrated DID system providing identity authentication
- **Modular Architecture**: Build efficient applications using ME Hub's modular design

## How to Develop DApps?

From a developer's perspective, DApp development is essentially about interacting with smart contracts. You can directly call contracts through the Web, or interact with contracts through SDKs. The entire development process is roughly divided into three major phases: development environment preparation, contract development, and frontend or backend development.

### 1. Development Environment Preparation

Depending on development needs, you can choose one of the following environments to assist with development and testing:

#### Private Network

Setting up a private node or network locally can help you quickly develop and debug local applications.

**Advantages**:
- Completely local, independent of external networks
- Fast block generation, accelerating testing
- Free to configure network parameters
- No test tokens needed

**Reference Document**: [Private Network Setup Guide](developer-guide/node-deployment/private-network-setup-guide)

#### Test Network

Connecting to the test network allows you to test your code in a more open environment.

**Testnet Configuration**:
- **Chain ID**: `mechain_400-1`
- **Currency Symbol**: MEC
- **Explorer**: https://www.explorer-testnet.me/

**ME Hub Node**:
- RPC: `https://beta-hub-26657.explorer-testnet.me`
- REST API: `https://beta-hub-1317.explorer-testnet.me`
- gRPC: `https://beta-da-9090.explorer-testnet.me:9090`


**Reference Document**: [Connect to Test Network](developer-guide/node-deployment/testnet-node-setup-guide)

#### Mainnet

When you have completed all testing on private and test networks, you can seamlessly migrate to ME Hub mainnet.

**Mainnet Configuration**:
- **Chain ID**: `me-chain`
- **Currency Symbol**: MEC
- **Explorer**: https://explorer.mec.me/

### 2. Contract Development

ME Hub supports WASM virtual machine, and developers can choose contract development languages based on their expertise.

#### WASM Smart Contract Development

WASM supports developing high-performance smart contracts using Rust language.

**Getting Started**:
- Learn how to compile, publish, and call WASM contracts on ME Hub
- Use Rust and WASM SDK for development
- Interact with contracts through CLI or SDK

**Development Costs**:
- WASM contracts execute more efficiently
- GasFee is typically lower than other contract types
- Supports more complex business logic

**Contract Libraries**:
- WASM standard library
- Common contract templates
- Cross-contract call examples

**Reference Document**: [WASM Module](./developer-guide/smart-contract-development)

### 3. Frontend or Backend Development

#### Web Frontend Development

If you want to directly interact with contracts through Web frontend, you can use the following tools:

**MetaMask Integration**:
- Support integrating MetaMask wallet in DApps
- Users can sign transactions directly in the browser
- Compatible with all Ethereum Web3 libraries

**JavaScript SDK**:
- **Web3.js**: Ethereum standard JavaScript library
- **Ethers.js**: Modern Ethereum JavaScript library
- **CosmJS**: Cosmos SDK JavaScript library
- How to use JS to interact with contracts or ME Hub network

**Development Frameworks**:
- React / Vue / Angular and other mainstream frontend frameworks
- Next.js / Nuxt.js full-stack frameworks
- Seamless integration with Web3 wallets

### 4. How to Issue Tokens?

ME Hub inherits the WASM virtual machine and theoretically can be compatible with tokens of all Ethereum standard protocols.

#### MRC-20 Tokens

**Standard Features**:
- Fungible Token
- Standard interfaces for transfer, authorization, balance query, etc.
- Fully compatible with Ethereum ERC-20 standard

**Issuance Process**:
1. Write MRC-20 contract or use standard template
2. Deploy on testnet and thoroughly test
3. Audit contract code to ensure security
4. Deploy to mainnet and issue tokens

**Reference Document**: [MRC-20 Token Standard](./mrc-token/mrc20-token-contract.md)

#### ERC-721 / MRC-721 Tokens

**Standard Features**:
- Non-Fungible Token (NFT)
- Uniquely identified digital assets
- Fully compatible with Ethereum ERC-721 standard

**Application Scenarios**:
- Digital artwork
- Game items
- Digital identity credentials
- Virtual land and assets

**Reference Document**: [MRC-721 Token Standard](./mrc-token/mrc721-nft-contract.md)

## Recommended Development Tools

### IDEs and Editors

- **Remix IDE**: Online Solidity development environment, suitable for rapid prototyping
- **VS Code**: Universal code editor, supports Solidity and Rust with plugins
- **IntelliJ IDEA**: Professional IDE supporting Rust development

### Frameworks and Toolchains

- **Hardhat**: Ethereum contract development framework
- **Truffle**: Classic contract development suite
- **Foundry**: Fast Ethereum development tool written in Rust
- **WASM**: Cosmos smart contract development framework

## Testing Resources

### Faucet

If you need test tokens, you can obtain them through the following ways:

**How to Get**:
- Visit official faucet website (🚧 Feature under development, stay tuned)
- Join community Discord to apply
- Contact development team to obtain

**Usage Rules**:
- Each address can claim once every 24 hours
- Limited quantity per claim
- Test tokens are for testing only and have no actual value

### Testnet Explorer

**Features**:
- Query transaction details
- View block information
- Monitor account balance and history
- Verify contract code

**Address**: https://www.explorer-testnet.me/ (🚧 Feature under development, stay tuned)

---

**Document Version**: v2.0.0  
**Last Updated**: 2026-02-09  
**Maintainer**: Meta Earth Development Team
