---
sidebar_position: 1
title: Network Details
---

# Meta Earth Public Chain Network Details

## Overview

The Meta Earth (ME) network is a modular blockchain platform designed to support traditional industry applications' demands for high-concurrency big data processing through a high-performance, infinitely scalable, multi-dimensional fusion underlying value network. Its design goal is to provide high-performance, compliant, privacy-protecting, multi-chain interactive infrastructure for Web3, promoting comprehensive prosperity of the digital cryptocurrency era.

---

## Mainnet

### Mainnet Features

The Meta Earth mainnet is a public chain with real economic value, adopting a modular architecture design that decouples the traditional "monolithic chain" into execution layer, settlement layer, data availability layer, and consensus layer. This design significantly improves blockchain development efficiency and convenience, bringing unprecedented scalability to the network.

### Mainnet Technical Architecture

#### 1. Execution Layer (Rollup)
- **Function**: Executes smart contracts and transaction logic, providing high-performance transaction processing
- **Technical Implementation**: Based on Rollup technology, moves computation to off-chain execution
- **Scalability**: Supports unlimited number of Rollups running in parallel

#### 2. Settlement Layer (ME Hub)
- **Function**: Processes transaction settlement and final confirmation, ensuring transaction security and consistency
- **Consensus Mechanism**: Adopts Tendermint consensus algorithm, ensuring network decentralization and security
- **State Management**: Maintains global state tree, recording all Rollup state changes

#### 3. Data Availability Layer (DA Layer)
- **Function**: Responsible for storing and providing transaction data, ensuring data availability and integrity
- **Technical Features**: Adopts advanced data storage and retrieval mechanisms, supporting high-concurrency data access
- **Performance Metrics**: Supports data processing capability of tens of thousands of transactions per second


---

## Execution Layer (Rollup)

### Rollup Architecture

Rollup is an application-specific modular blockchain built on Meta Earth, with the following characteristics:

#### 1. High-Performance Execution
- **Transaction Throughput**: Supports thousands of transactions per second
- **Low Latency**: Transaction confirmation time typically within 2-3 seconds
- **Low Cost**: Transaction fees significantly reduced compared to main chain

#### 2. Sovereignty Design
- **Independent Token Economy**: Can issue own tokens
- **Custom Governance**: Implement unique governance mechanisms
- **Business Logic Customization**: Supports complex business logic implementation

#### 3. Modular Components
- **Consensus Module**: Can choose different consensus mechanisms (such as Tendermint, PoA, etc.)
- **Execution Engine**: Supports WASM virtual machines
- **State Management**: Custom state storage and management mechanisms
- **Network Layer**: Flexible configuration of P2P network topology
- **API Interfaces**: Provides standard JSON-RPC, REST, and WebSocket interfaces

### Rollup and Hub Interaction

#### 1. State Submission
- **Regular Submission**: Rollup regularly submits state roots to Hub
- **State Verification**: Hub verifies Rollup's state transitions
- **Final Confirmation**: Hub confirms Rollup's state updates

#### 2. Asset Bridging
- **Deposit**: Users transfer assets from Hub to Rollup
- **Withdrawal**: Users transfer assets from Rollup back to Hub
- **Cross-chain Exchange**: Supports asset exchange between different Rollups

---


## Settlement Layer (ME Hub)

### ME Hub Architecture

ME Hub is the core settlement layer of the Meta Earth network, responsible for maintaining the security and consistency of the entire network. The Hub layer has the following core functions:

#### 1. Consensus Mechanism
The Hub layer adopts efficient consensus configuration, with key parameters including block generation period, maximum block capacity limit, validator set definition, and base staking token type.

Validators, as the network's core nodes, have structures including unique account addresses, public keys for identity identification, voting weight values representing their weight in the network, and commission ratio configurations related to revenue distribution.

#### 2. State Management
- **Global State Tree**: Maintains state roots of all Rollups
- **State Verification**: Verifies state transitions submitted by Rollups
- **State Synchronization**: Ensures consistency of states across all nodes

#### 3. Cross-chain Communication
- **MBC Protocol**: Supports interoperability with other ME ecosystem chains
- **Message Routing**: Processes forwarding and verification of cross-chain messages
- **Asset Transfer**: Supports cross-chain asset transfer and exchange

### Hub Layer Security Mechanisms

#### 1. Validator Staking
Validators can be created and staked through on-chain transactions. The staking process includes specifying the staking token amount (usually in minimum unit umec), submitting the validator's consensus public key, setting the validator's display name (Moniker). Additionally, minimum self-delegation amount must be specified.

#### 2. Punishment Mechanisms
- **Double-signing Penalty**: Severe punishment for malicious validators
- **Offline Penalty**: Penalties for validators offline for extended periods
- **Governance Penalty**: Special penalty measures decided through governance voting

#### 3. Upgrade Mechanisms
- **Software Upgrades**: Supports fork-free software upgrades
- **Parameter Adjustment**: Adjust network parameters through governance voting
- **Emergency Upgrades**: Rapid network upgrades in emergencies

---

## Data Availability Layer (DA Layer)

### DA Layer Architecture

ME DA, as Meta Earth's data availability layer, is primarily responsible for storing application data for Rollups and providing trusted data storage services. Built on the Celestia blockchain platform with major improvements.

#### Core Functions
- **Data Storage**: Responsible for storing and providing transaction data, ensuring data availability and integrity
- **Data Proof**: Provides data availability proofs, ensuring data can be verified and retrieved
- **Cross-chain Bridging**: Interacts with ME Hub for assets and data through MBC protocol

#### Technical Architecture

**Modular Design**
- **Keepers Management**: Manages Keepers for each module, responsible for coordinating different modules
- **Cosmos SDK Integration**: Integrates various modules of Cosmos SDK and custom data storage modules
- **Cross-module Interaction**: Supports event processing and hook functions between modules

**Core Innovations**
1. **New Economic Model**: Adopts cross-chain derived UDMEC tokens, no inflation
2. **MBC Cross-chain Integration**: Breaks through Celestia's cross-chain limitations, enabling true cross-chain asset transfer
3. **GasFee Allocation Mechanism**: Innovative fee allocation mechanism, supporting unified settlement of Rollup, Hub, and DA
4. **Staking Token System**: Validator staking and governance system based on UDMEC

### DA Layer Token Economics

**UDMEC Token**
- ME DA doesn't issue native tokens, adopts UMEC from ME Hub cross-chain conversion to UDMEC as core token
- **Uses**:
  - Transaction fee payment
  - Governance voting rights
  - Governance proposal deposits
  - Validator node staking

**Genesis Token Mechanism**
- To start block production before MBC connection is established, ME DA issues a predetermined number of UDMEC in genesis stage
- These tokens are only used for validator staking and consensus voting
- After reaching specified block height (such as 100 blocks):
  - All initially staked UDMEC automatically redeemed
  - All genesis-issued UDMEC burned

### GasFee Mechanism

**Fee Market**
- Adopts standard Gas price-based priority mempool
- Higher Gas price transactions processed with priority by validators
- Starting from version v1.0.0, no protocol-enforced minimum fee (similar to Ethereum EIP-1559)

**Gas Calculation**
- **Fixed Cost (FC)**: Approximately 65,000 gas (for signature verification, transaction size, etc.)
- **Dynamic Cost**: Calculated based on blob size
  - Gas Limit = FC + Σ(SSN(Bi) × SS × GCPBB)
  - SSN: Number of shares required for each blob
  - SS: Size of each share
  - GCPBB: Gas cost per byte

**Fee Allocation**
Unlike Celestia, ME DA's GasFee allocation mechanism:
1. Fees collected in each block stored in distribution module account, not immediately distributed
2. After predetermined distribution period, accumulated fees distributed proportionally to treasury address (feeTreasuryAddress) and development operation address (devOperatorAddress)
3. No block rewards (because there is no token inflation)

### Performance Metrics
- **Data Throughput**: Supports data processing capability of tens of thousands of transactions per second
- **Storage Efficiency**: Optimizes storage through data sharding and compression technology
- **Verifiability**: Provides light client Data Availability Sampling (DAS) proof

---

## Testnet

### Testnet Features

The Meta Earth testnet is functionally identical to mainnet, potentially ahead in version. The testnet provides the following services for developers:

#### 1. Development Test Environment
- **Function Testing**: Test smart contract and DApp functionality
- **Performance Testing**: Test high-concurrency and large data volume processing
- **Security Testing**: Test various attack scenarios and protection mechanisms

#### 2. Network Configuration
The testnet uses the specific identifier `Meta Earth-testnet`. Developers can interact through RPC endpoints, REST API interfaces, and WebSocket protocol provided by the testnet, with relevant service endpoints distributed under the testnet's official domain.

#### 3. Obtaining Test Tokens
- **Faucet Service**: Developers can obtain test tokens through faucet
- **Test Accounts**: Supports batch creation of test accounts

---

### Testnet Tools

#### 1. Block Explorer
- **Transaction Query**: Query transaction status and details
- **Account Query**: Query account balance and transaction history
- **Contract Query**: Query smart contract status and calls

#### 2. Development Tools
Developers can use Ethereum-compatible standard libraries (such as ethers.js) to connect to the testnet. By specifying the JSON-RPC entry address (typically port 8545) and initializing personal private keys, wallet instances can be constructed to interact with the testnet. Subsequently, contract factory instances can be used to complete one-click deployment of smart contracts.

---

### Differences Between Testnet and Mainnet

| Feature | Testnet | Mainnet |
|---------|---------|---------|
| Token Value | No real value | Has real economic value |
| Network Stability | May be unstable | Highly stable |
| Feature Updates | Ahead version | Stable version |
| Data Persistence | May reset | Permanently saved |
| Fees | Free or very low | Actual fees |

---

### Testnet Best Practices

#### 1. Development Process
1. **Local Development**: Complete basic development in local environment
2. **Testnet Deployment**: Deploy to testnet for function verification   
3. **Stress Testing**: Conduct high-concurrency and stress testing
4. **Security Audit**: Conduct security vulnerability scanning and fixes
5. **Mainnet Deployment**: Deploy to mainnet after confirming no issues

#### 2. Testing Strategy
- **Unit Testing**: Test individual functional modules
- **Integration Testing**: Test module interactions
- **End-to-End Testing**: Test complete business processes
- **Performance Testing**: Test system performance limits
- **Security Testing**: Test various security scenarios

Through this complete network architecture, Meta Earth provides developers with a high-performance, scalable, secure blockchain development platform, supporting development needs from simple smart contracts to complex decentralized applications.

