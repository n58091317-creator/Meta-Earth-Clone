---
sidebar_position: 6
title: MBC
---

# MBC (Multi-Blockchain Communication Protocol)

## Overview

MBC (Multi-Blockchain Communication) is Meta Earth's cross-chain communication protocol, derived from the Cosmos network's MBC protocol. It is a new protocol fully compatible with native Cosmos MBC. Through MBC, Meta Earth can communicate with Rollup chains, multiple Rollup chains, and various Cosmos chains.

## Core Features

### 1. Cross-Chain Communication

MBC enables cross-chain communication capabilities between different independent blockchains. Meta Earth can serve as the central hub in this ecosystem, connecting and coordinating multiple blockchain networks.

### 2. Cross-Chain Asset Transfer

Through the MBC protocol, users can send and receive assets between different blockchains. For example:
- Tokens can be transferred from one blockchain to another
- Enable cross-chain value transfer
- Support cross-chain circulation of multiple asset types

### 3. Interoperability

MBC allows blockchain networks to send and receive the following between each other:
- **Data**: Cross-chain data exchange and synchronization
- **Assets**: Digital assets such as tokens and NFTs
- **Contract Calls**: Cross-chain smart contract interactions
- **Other Information**: Metadata, state proofs, etc.

This interoperability enables different blockchains to work together, share resources, and execute cross-chain value transfers.

### 4. Security

MBC adopts multiple security mechanisms to ensure the safety and reliability of cross-chain interactions:

**Byzantine Fault Tolerance Mechanism**:
- Inherits security guarantees from ME-Tendermint consensus algorithm
- Can tolerate malicious behavior from some nodes in the network
- Ensures security of the entire network ecosystem

**Identity Authentication Mechanism**:
- Strict cross-chain message verification
- Cryptography-based identity authentication
- Prevents unauthorized cross-chain operations

### 5. Scalability

Through the MBC protocol, Meta Earth can connect to other ME blockchain networks, with the following expansion capabilities:

- **Multi-Chain Connectivity**: Supports simultaneous communication with multiple blockchains
- **Business Customization**: Meets the needs of different business scenarios
- **Large-Scale Applications**: Lays the foundation for larger-scale applications
- **Ecosystem Integration**: Seamlessly integrates the ME ecosystem

## Meta Earth Exclusive Features

### DID Cross-Chain Communication

MBC supports Meta Earth's unique scenarios, including cross-chain communication for Decentralized Identity (DID):

**Feature Highlights**:
- DID messages can be passed between different chains
- Rollup chains can securely access DIDs created by users on ME Hub
- Enable cross-chain identity authentication and verification
- Support cross-chain sharing of identity information

**Application Scenarios**:
- Users use ME Hub's DID for identity verification on Rollup chains
- Cross-chain DApps share user identity information
- Unified user identity management
- Cross-chain compliance verification

## Architecture Design

The MBC protocol architecture inherits the core design philosophy of MBC, while optimizing for Meta Earth's characteristics:

```
ME Hub (Central Hub)
    ↓ MBC Protocol
    ├── Rollup Chain 1
    ├── Rollup Chain 2
    ├── ME Chain 1
    ├── ME Chain 2
    └── Other Compatible Chains
```

**Key Components**:
1. **ME Hub**: Acts as the central hub, coordinating cross-chain communication
2. **Rollup Chains**: Execution layer blockchains, communicating with ME Hub via MBC
3. **ME Chains**: Other ME chains in the ecosystem
4. **MBC Module**: Responsible for sending, receiving, and verifying cross-chain messages

## Compatibility with MBC

MBC is an enhanced version developed based on the MBC protocol:

**Inherited Features**:
- Fully compatible with MBC protocol standards
- Supports standard MBC cross-chain transfers
- Follows MBC's security model

**Innovative Extensions**:
- Supports special communication needs of Rollup chains
- Adds DID cross-chain communication functionality
- Optimizes cross-chain performance and latency

## Application Scenarios

### 1. Cross-Chain Asset Exchange

Users can freely exchange assets between different blockchains without centralized exchanges:
- Asset swaps between Rollup chains
- Asset transfers between ME Hub and other ME chains
- Cross-chain DEX and liquidity pools

### 2. Cross-Chain DApps

Developers can build decentralized applications running across multiple chains:
- Manage user identity (DID) on ME Hub
- Execute business logic on Rollup chains
- Access specific resources on other chains

### 3. Cross-Chain Governance

Enable multi-chain collaborative governance:
- Cross-chain voting and proposals
- Unified governance decision execution
- Multi-chain resource coordination

### 4. Cross-Chain Data Sharing

Share data and state between different chains:
- Oracle data cross-chain transmission
- State proof verification
- Cross-chain event listening

## Technical Advantages

### 1. Security Assurance

- Based on ME-Tendermint consensus algorithm
- Byzantine fault tolerance guarantee
- Cryptographic verification mechanism

### 2. High Performance

- Optimized cross-chain message passing
- Parallel processing capabilities
- Low latency communication

### 3. Ease of Use

- Compatible with MBC standard tools
- Comprehensive development documentation
- Rich SDK support

### 4. Scalability

- Supports unlimited number of chain connections
- Modular design
- Flexible protocol upgrades

## Future Development

The MBC protocol will continue to evolve, supporting more innovative features:

1. **Performance Optimization**: Further improve cross-chain communication speed and throughput
2. **Feature Expansion**: Support more types of cross-chain interactions
3. **Ecosystem Integration**: Establish connections with more blockchain networks
4. **Standard Setting**: Promote the development of cross-chain communication standards

---

**Document Version**: v2.0.0  
**Last Updated**: 2026-02-09  
**Maintainer**: Meta Earth Development Team
