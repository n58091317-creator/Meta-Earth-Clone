---
sidebar_position: 3
title: Consensus Mechanism
---

# ME Hub Consensus Mechanism

## Overview

ME Hub adopts a **PoS (Proof of Stake)** consensus mechanism based on **CometBFT** (formerly Tendermint Core), combined with the core concepts of **PBFT (Practical Byzantine Fault Tolerance)**, achieving high-performance, instant finality, and Byzantine fault-tolerant blockchain consensus. This document details ME Hub's consensus process, validator management, security mechanisms, and technical implementation.

## Consensus Engine

### CometBFT v0.37.5

ME Hub uses CometBFT v0.37.5 as the underlying consensus engine, a battle-tested consensus implementation in the ME ecosystem.

The application layer interacts with the consensus engine through the standard ABCI interface. At the beginning and end of each block, the system automatically triggers corresponding processing logic, driving various functional modules to complete state updates and transaction settlements.

**Main Features**:

1. **Instant Finality**: Once a block is confirmed, it cannot be rolled back
2. **High Throughput**: Supports thousands of transactions per second
3. **Byzantine Fault Tolerance**: Tolerates up to 1/3 malicious nodes
4. **Low Latency**: Block confirmation time is approximately 5 seconds
5. **Scalability**: Supports dynamic validator sets

## PoS Proof of Stake Mechanism

### Stake Model

The consensus security of ME Hub is based on the amount of tokens staked by validators. Validators need to lock a certain amount of ME tokens to participate in the consensus process.

#### Validator Weight Calculation

A validator's voting weight is determined by their stake amount:

```
Voting Weight = Validator Self-Stake + Delegator Stakes
```

**Weight Limit**: To prevent centralization, a single validator's voting weight should not exceed a certain percentage of the total network weight (recommended 10%).

#### Staking Requirements

The system sets clear staking thresholds: the minimum delegation amount for ordinary users is 0.01 MEC. For validator nodes, the default consensus weight adjustment factor is 100, and the self-stake amount must be at least 1 MEC.

**Validator Creation Process**:
When creating a validator, the system first verifies whether the public key type (such as Ed25519 or Secp256k1) is supported according to current consensus parameters. Subsequently, the system initializes the validator object and sets the commission strategy, including the initial rate, maximum rate limit, and maximum daily rate change. Additionally, the system records the node owner's address and establishes multi-dimensional query indexes (such as by consensus address and voting weight). After completing these operations, the system triggers post-creation hook functions and automatically executes the initial stake operation, marking the node status as pending bond.

### Validator States

Validators have three states in the system:

```go
const (
    Unbonded  BondStatus = iota  // 0: Not bonded, not participating in consensus
    Unbonding                     // 1: Unbonding, waiting for unbonding period to end
    Bonded                        // 2: Bonded, participating in consensus
)
```

**State Transitions**:

```
Create Validator → Unbonded → (Reach min stake) → Bonded → (Start unbonding) → Unbonding → (Unbonding period ends) → Unbonded
                     ↓                                ↑
                   (Slashed) ←──────────────────────┘
```

## PBFT Consensus Process

### Consensus Protocol Overview

CometBFT adopts an improved PBFT (Practical Byzantine Fault Tolerance) algorithm, ensuring the system can still operate normally when up to 1/3 of nodes in the network experience Byzantine failures.

### Three-Phase Consensus

#### 1. Propose Phase (Proposal)

**Block Proposer Selection**:
The proposer selection is based on a weighted round-robin algorithm, determining a legitimate proposer for each block period. At the beginning of each block, the system calculates the total weight of participating signatures based on the previous block's commit information and precisely records the proposer's consensus address for subsequent reward distribution.

**Proposer Responsibilities**:
1. Select transactions from the transaction pool
2. Construct a new block
3. Sign the block
4. Broadcast the block proposal to all validators

#### 2. Prevote Phase (Pre-vote)

**Validator Block Verification**:

```
1. Verify block format
2. Verify transaction validity
3. Execute transactions (temporary state)
4. Check state root hash
5. If everything is normal, broadcast Prevote message
```

**Over 2/3 Prevote**:
- When a block receives Prevotes from over 2/3 validator weight
- Enter Precommit phase
- If no block gets 2/3 Prevote, proceed to next round

#### 3. Precommit Phase (Pre-commit)

**Final Confirmation**:
In the precommit phase, the system calculates the final validator set changes for this block. This process includes: applying the latest stake weight updates, processing the list of validators in the unbonding queue that have expired, and settling all mature unbonding transactions. After transaction processing is complete, the system broadcasts corresponding completion events, including amount changes and associated address information.

**Over 2/3 Precommit**:
Once over 2/3 weight of precommit signatures is obtained, the block is considered finally confirmed. At this point, all state changes take permanent effect and cannot be rolled back, achieving instant finality.

### Block Generation Process

```
Start New Height
    ↓
Select Proposer (Based on Weighted Round-Robin)
    ↓
Proposer Constructs Block
    ↓
Broadcast Proposal
    ↓
Validators Verify Block
    ↓
Broadcast Prevote (> 2/3 Weight)
    ↓
Enter Precommit Phase
    ↓
Broadcast Precommit (> 2/3 Weight)
    ↓
Commit Block (Instant Finality)
    ↓
Execute BeginBlock
    ↓
Process Transactions
    ↓
Execute EndBlock
    ↓
Update Validator Set
    ↓
Next Block Height
```

## Block Structure

### Block Components

A complete block consists of four core parts: Header, Data (transaction data), Evidence (governance evidence), and Last Commit (precommit signatures from the previous block).

The block header contains key blockchain metadata, including: protocol version information, unique chain ID, current block height, precise block timestamp, and cryptographic hashes pointing to the previous block and last commit. It also records hashes of the current and next validator sets, consensus parameter hash, application state root hash (App Hash), transaction result hash, and the address of the current block proposer.

### Block Parameters

Core consensus parameters are defined in the system's genesis configuration file: the maximum capacity of a single block is limited to 4 MB, while the Gas consumption limit is set to unlimited in the underlying configuration (dynamically regulated by the upper-layer Gas price mechanism).

**Key Parameters**:

- **Block Size**: Maximum 4 MB
- **Block Gas**: Unlimited (regulated through Gas price mechanism)
- **Block Time**: Approximately 5 seconds
- **Blocks per Year**: 6,307,200 (365 × 24 × 60 × 60 / 5)

## Validator Set Management

### Dynamic Update Mechanism

The validator set is dynamically adjusted at the end of each block. The system periodically processes validator change requests, calculates the latest weight distribution, and returns it as a validator update list to the consensus engine.

### Validator Ordering

Validators are ordered by weight (stake amount):

```
Top Validator Set = Top N validators after sorting
```

**Sorting Rules**:
1. Sort by stake amount in descending order
2. When stake amounts are equal, sort by address in lexicographical order

### Validator Weight Index

During system initialization or block operation, the system maintains a precise validator index system. This includes storing core validator information, establishing mappings by consensus address, and building real-time weight sorting indexes. Whenever a validator's state switches between bonded, unbonding, and unbonded, the system tracks the total token amount for each state in real-time, ensuring the accuracy of the network's consensus weight.

## Security Mechanisms

### Slashing Penalty Mechanism

#### Penalty Types

**1. Double Sign**

The most serious consensus violation:

```
Penalty: Slash 5% stake + Permanent imprisonment (Tombstone)
```

- Validator signs two different blocks at the same height
- Imprisoned validators are permanently removed from the validator set
- All stakes (including delegations) are slashed

**2. Downtime Penalty**

The system promptly handles inactive validators through reasonable parameter settings. In the genesis configuration, the signature monitoring window is set to 10,000 blocks (approximately 14 hours). Validators must complete at least 80% of signatures within each window period. If they fail to meet this requirement, validators will be jailed, during which the node does not participate in consensus and does not generate revenue.

> Note: In the current system configuration, **jailing is indefinite** — once jailed, nodes remain in the jailed state until the validator actively initiates an `Unjail` transaction and is accepted by the system; the system does not automatically release from jail after reaching a fixed duration.

**Downtime Parameters**:

- **Signature Window**: 10,000 blocks (~13.9 hours)
- **Minimum Signature Rate**: 80% (must sign at least 8,000 blocks)
- **Jail Duration**: Indefinite (validator must actively initiate `Unjail`)
- **Slash Ratio**: 0% (No slashing, only jailing)

**Penalty Process**:

```
Downtime Detected
    ↓
Jail Validator (Jail)
    ↓
Stop Participating in Consensus
    ↓
Stop Receiving Rewards
    ↓
Validator Must Actively Initiate Unjail Transaction
    ↓
Pass Unjail Verification and Resume Consensus Participation
```

#### Slashing Implementation Example

**Sequencer Penalty**:
When a sequencer violation is detected, the system triggers penalty logic. The penalty scope covers bonded and unbonding nodes. Core operations include: forcibly burning (Burn) all staked tokens from the node's balance pool and resetting its state to unbonded and jailed. If the node is in the unbonding queue, the system removes it and updates proposer rotation information in real-time. Finally, the system publishes penalty event logs, recording the penalized address and the scale of funds destroyed.


### Byzantine Fault Tolerance

**Security Guarantees**:

- Tolerate at most **f = ⌊(n-1)/3⌋** Byzantine nodes
- Require at least **2f + 1** honest nodes
- Network with honest node weight > 2/3 is secure

**Examples**:

| Total Validators (n) | Max Byzantine Nodes (f) | Min Honest Nodes (2f+1) |
|---------------------|------------------------|------------------------|
| 4                   | 1                      | 3                      |
| 7                   | 2                      | 5                      |
| 10                  | 3                      | 7                      |
| 100                 | 33                     | 67                     |

## Consensus Parameter Configuration

### Genesis Configuration

The system's consensus behavior is defined by a set of genesis parameters. This includes: block maximum capacity set at 4 MB, timestamp precision (Time Iota) set at 1 second. In governance evidence management, the system retains violation evidence from the last 100,000 blocks or 48 hours. Additionally, nodes support multiple public key types (including Ed25519 and Secp256k1) to ensure compatibility with ecosystems like Ethereum.

### Staking Parameters

Key parameters related to staking logic are as follows: token unbonding from nodes requires a 7-day (604,800 seconds) cooling period. The system supports a maximum of 100 active validators and reserves 7 parallel unbonding record slots for each delegator-validator pair. For audit convenience, the system stores the last 10,000 historical records and sets `umec` as the base staking unit.

### Slashing Parameters

To maintain network order, the system sets strict penalty parameters: signature statistics window size is 10,000 blocks, and nodes must achieve 80% signature coverage within the window. Once downtime violation is triggered, the node will be jailed for 120 seconds; for malicious behavior like Double Sign, the system implements a high slash ratio of 5%.

## Consensus Performance Metrics

### Block Parameters

```go
// Source reference: x/wmint/types/keys.go
const (
    OneYearTotalBlocks = 6307200.0     // Blocks per year
    OneDayTotalBlocks  = 17280         // Blocks per day
)
```

**Performance Metrics**:

- **Block Time**: ~5 seconds
- **Blocks per Day**: 17,280
- **Blocks per Year**: 6,307,200
- **TPS (Theoretical)**: Depends on transaction type and Gas, generally 1000-5000 TPS
- **Final Confirmation Time**: ~5 seconds (instant finality)
    
### Gas Mechanism

The system introduces an Ethereum EIP-1559-like base fee management mechanism. Fee calculation is based on block height and current gas market demand. During each block processing, the system compares the gas consumption of the parent block with the set target threshold (determined jointly by the elasticity multiplier and block gas limit): if consumption exceeds the target, the base fee automatically increases to suppress demand; otherwise, it decreases, achieving smooth prediction and dynamic balance of transaction fees.

## Governance Voting Mechanism

### Vote Weight Calculation

In the governance tally phase, the system executes detailed vote counting logic for each proposal. First, the system retrieves all bonded validator sets across the network, obtaining their corresponding total stake amounts, delegation shares, and basic identity information. To ensure fairness, ME Hub adopts an improved one-person-one-vote or voting power-based weighted counting method.

When processing votes, the system traverses all valid voting records, excluding duplicate votes. Subsequently, the system performs three core checks: first is the "quorum" check, where the proportion of voting interests must reach a preset ratio (such as 33.4%); second is the "veto" check, where if the proportion of votes against and vetoing exceeds one-third, the proposal will directly fail and may forfeit the deposit; finally is the "passing threshold" calculation, where after excluding abstentions, the proportion of yes votes must reach a majority (such as over 50%) to pass.

### Proposal Passing Conditions

1. **Quorum**: At least 33.4% of validators vote
2. **Threshold**: Over 50% of non-abstaining votes are in favor
3. **Veto**: Less than 33.4% of votes are veto

## Consensus Upgrade

### Chain Upgrade Process

ME Hub supports smooth chain upgrade mechanisms. Developers define a unique upgrade name and corresponding upgrade height (Upgrade Handler). When the chain operation reaches the predetermined height, the system automatically pauses normal transaction processing and executes predefined migration logic. This includes running state migration functions for various functional modules and executing custom adjustments specific to particular versions (such as state reorganization or new module initialization). Once all migration hooks successfully run and are recorded in the logs, the chain continues to operate in the new version state, achieving forkless upgrades.

**Upgrade Steps**:

1. Submit upgrade proposal
2. Validators vote
3. After proposal passes, stop chain at specified height
4. All nodes upgrade binary files
5. Restart chain, execute upgrade handler
6. Chain continues running on new version

## Monitoring and Alerting

### Key Monitoring Metrics

**Consensus Health Metrics**:

Operations personnel can enable telemetry monitoring by modifying application and consensus engine configuration files. This mainly includes enabling Prometheus metrics export, setting data retention time, and configuring whitelists for cross-origin access. Once enabled, the system exposes operational data in real-time through dedicated ports.

**Important Metrics**:

1. **Block Height**: Current height of the chain
2. **Block Time**: Generation time of each block
3. **Validator Uptime**: Validator signature rate
4. **Sync Status**: Whether nodes are synchronized with the network
5. **Voting Power Distribution**: Validator weight distribution
6. **Proposer Rotation**: Block proposer changes
7. **P2P Connections**: Number of node connections
8. **Mempool Size**: Number of pending transactions

**Document Version**: v2.0.0  
**Last Updated**: 2026-02-09  
**Maintainer**: Meta Earth Development Team  
**Consensus Engine**: CometBFT v0.37.5
