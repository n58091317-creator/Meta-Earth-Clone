---
sidebar_position: 4
title: Governance Mechanism
---

# ME Hub Governance Mechanism

## Overview

ME Hub adopts an on-chain governance mechanism, allowing community members to participate in protocol decision-making and evolution through proposals and voting. The governance system is based on the Gov module, combined with ME Hub's unique DAO architecture, implementing decentralized, transparent, and efficient governance processes. This document details ME Hub's governance architecture, participating roles, proposal types, voting mechanisms, and governance processes.

## Governance Architecture

### Multi-level Governance Structure

ME Hub adopts a multi-level governance structure, constructing a three-dimensional architecture that includes the global DAO, various functional departments (ME ID DAO, development operations team, airdrop management), and underlying foundations (validator nodes and users). This structure ensures that from macro strategy to specific execution, every link has clear power allocation and responsibility attribution: the global DAO steers direction, functional departments perform their duties (such as identity governance, technical decisions, community incentives), while validator nodes and users participate in daily operations through consensus and delegation.

### DAO Address System

ME Hub establishes a rigorous DAO address system to clarify the functions of different governance entities. This encompasses the global DAO address with network-wide highest decision-making power, the ME ID DAO address focused on identity management, the development operations address responsible for technical decisions, and the airdrop distribution address specifically for community incentives.

The underlying system uses dedicated processors to manage these addresses. These roles have clear divisions: the global DAO has the highest governance authority and fund management rights; the ME ID DAO handles identity-related governance logic; the development operations team is responsible for continuous architectural upgrades; the airdrop team manages the precise distribution of incentive funds. Through this multi-dimensional architecture, ME Hub achieves efficient and transparent decentralized decision-making.

## Participating Roles

### 1. Global DAO

**Authority and Responsibilities**:

- **Highest Governance Authority**: Has protocol's highest decision-making power
- **DAO Member Management**: Can update DAO addresses and members
- **Protocol Parameter Modification**: Adjust key protocol parameters
- **Emergency Response**: Handle emergencies and security issues
- **Fund Management**: Manage DAO treasury funds

**Authority Verification and Security Rules**:
The underlying system protects the security of global DAO operations through strict permission gateways. Any sensitive operations involving DAO address changes or ME ID issuer adjustments require "global DAO" identity verification. During execution, the system automatically records operation logs, triggers relevant ME ID hook functions to synchronously update security lists, and broadcasts state change events network-wide, ensuring the entire governance process is public, transparent, and immutable.

### 2. ME ID DAO

**Authority and Responsibilities**:

- **Identity System Governance**: Manages DID and ME ID NFT related rules
- **ME ID Verification Issuance**: Serves as ME ID verification issuer
- **Identity Standard Formulation**: Formulates and updates identity standards
- **Identity Dispute Handling**: Handles identity-related disputes

### 3. Development Operations Team (Dev Operator)

**Authority and Responsibilities**:

- **Technical Development**: Responsible for protocol technical development and maintenance
- **Upgrade Implementation**: Execute chain upgrades and technical updates
- **Committee Reward Reception**: Receive protocol committee rewards
- **Technical Support**: Provide technical support and documentation

### 4. Validator Nodes

**Authority and Responsibilities**:

- **Proposal Voting**: Vote on all on-chain governance proposals
- **Block Production**: Continuously participate in network consensus and bear block production duties
- **Network Security**: Maintain network high security through staking and compliant operation
- **Community Representatives**: Exercise governance voting rights on behalf of delegators by default

**Voting Weight**:
ME Hub introduces an improved **one-person-one-vote** model. During vote counting, the system traverses all bonded active validators, allocating equal voting weight to each node. Regardless of validator staking size, this mechanism ensures equal voice in governance decisions for all nodes, preventing excessive power concentration.

### 5. Regular Users/Delegators

**Authority and Responsibilities**:

- **Delegated Voting**: Users can indirectly participate in network governance decisions by delegating tokens to trusted validators
- **Proposal Submission**: Any holder can submit new governance proposals provided minimum deposit requirements are met
- **Staking Returns**: Users participating in governance and staking can receive corresponding network token rewards
- **Network Participation**: Actively participate in various on-chain economic activities and ecosystem construction

**Delegator Voting Rights Inheritance**:

Delegators can choose to vote themselves, otherwise their voting rights are represented by validators:

```
Delegator Voting Rights = Weight Delegated to Validator
If delegator votes themselves, overrides validator vote
If delegator doesn't vote, validator votes on behalf
```

## Proposal Classification

### 1. Text Proposal

**Uses**: 
- Community discussion and opinion gathering
- Protocol improvement suggestions
- Community initiatives and statements
- Non-mandatory decisions

**Characteristics and Process**:
- **Non-mandatory**: Voting results represent community opinion but don't trigger automated code execution
- **Low Threshold**: Suitable as preliminary polling for complex technical solutions
- **Community Consensus**: Important interactive channel for establishing ecosystem values and long-term planning

### 2. Parameter Change Proposal

**Core Uses**:
This type of proposal is specifically used to dynamically adjust operational parameters of various core modules on the blockchain, optimizing network performance and governance rules without requiring hard forks or network-wide downtime upgrades.

**Key Parameters and Rules**:
ME Hub's governance system contains a detailed set of modular parameter configurations:
- **Governance Module (`gov`)**: Sets minimum deposit limit (such as 1 MEC), voting window duration (such as 5 minutes for test environment or several days for mainnet), and quorum threshold for proposal passage
- **Staking Module (`staking`)**: Defines maximum validator limit, user unbonding lockup period, and other security parameters
- **Slashing and Minting Modules**: Controls node signature window tolerance and system token inflation curve, ensuring economic stability

All parameter changes follow rigorous "record-vote-execute" logic, automatically completing configuration file CRUD through on-chain proposals.

### 3. Software Upgrade Proposal

**Core Uses**:
Software upgrade proposals are the driving force for protocol self-evolution, used to deploy new features, optimize performance, or fix critical vulnerabilities. The system manages complex migration tasks through predefined upgrade handlers.

**Upgrade Execution Logic**:
During upgrades, the system initiates automated state migration processes. First, the underlying engine retrieves consensus versions of all active modules, establishing baselines for smooth transitions between old and new versions. Subsequently, targeted data corrections are performed for specific versions (such as v2.0.12), including deep migration of WNFT class data and dynamic adjustments to underlying block parameters (such as maximum Gas limit). Through fine-grained logging and transaction control, the system ensures all state machine states remain consistent after large-scale migrations, finally completing final protocol transition by running full migration scripts.

**Historical Upgrade Records**:

| Upgrade Version | Core Changes | Evolutionary Significance |
|-----------------|--------------|---------------------------|
| v2.0.10 | Introduced Rollup registration, sequencer management modules, and DID/ME ID identity system | Established ME Hub's core capabilities as Layer 2 settlement layer, inaugurating identity governance era |
| v2.0.11 | System routine maintenance and performance optimization | Improved network stability under long-term operation |
| v2.0.12 | WNFT data architecture optimization and block Gas limit adjustments | Resolved large-scale NFT data compatibility issues, significantly improved network throughput |

### 4. Community Pool Spend Proposal

**Uses**:
- Ecosystem project funding and developer incentives
- Marketing activities and community building funds
- R&D support for critical infrastructure

**Proposal Elements**:
When submitting this type of proposal, initiators need to detail fund usage, expected community benefits, recipient address, and precise token amount (in `umec` base units). After proposal passage, the system automatically transfers the corresponding amount from community treasury to specified address, with the entire process guaranteed by smart contract logic, decentralized and immutable.

### 5. MBC Client Update Proposal

**Uses**:
- Update MBC light client
- Handle client expiration
- Fix MBC connection issues

### 6. Other Specialized Proposals

- **Denom Metadata Proposal**: Create/update token metadata
- **Cancel Upgrade Proposal**: Cancel planned upgrades

## Governance Process

### Complete Process Diagram

```
Proposal Submission
    ↓
Deposit Period
    |
    ├─→ Insufficient Deposit → Proposal Failed → Return/Burn Deposit
    |
    ↓
Deposit Met → Enter Voting Period
    ↓
Voting Period
    |
    ├─→ Quorum Not Met → Proposal Failed → Return Deposit
    ├─→ Over 1/3 Veto → Proposal Vetoed → Burn Deposit
    ├─→ Over 1/2 Against → Proposal Rejected → Return Deposit
    |
    ↓
Over 1/2 In Favor → Proposal Passed
    ↓
Execute Proposal
    |
    ├─→ Execution Success → Proposal Status: Passed
    └─→ Execution Failure → Proposal Status: Failed
```

### Phase Details

#### 1. Proposal Submission Phase

**Basic Steps**:
1. **Content Preparation**: Clearly define proposal goal type (such as text, parameter change, or upgrade), write detailed description information
2. **Deposit Funds**: Initiator must simultaneously submit tokens meeting network "minimum deposit" requirement for support
3. **On-chain Broadcast**: Send proposal task network-wide through client, generating unique proposal ID on blockchain
4. **Activation Confirmation**: System validates proposal legality and deposit amount, then proposal officially enters public view

**Deposit Mechanism Rules**:
To prevent spam information flooding and filter high-quality proposals, the system sets strict thresholds:
- **Test Environment**: Lower threshold (such as 1 MEC), facilitating quick validation of governance logic for developers
- **Mainnet Environment**: Has higher deposit requirements, ensuring only motions with broad consensus and important value can drive network changes

Initiators can pay full deposit at once or crowdfund within time limit to supplement through community, fully mobilizing community participation enthusiasm.

#### 2. Deposit Period
After proposal submission, it enters a public fundraising window, ensuring only proposals with broad community support enter formal decision phase.
- **Interactive Mechanism**: Any community member can provide token support (Deposit) for proposals in deposit period
- **Time Window**: In mainnet environment, deposit period typically set to 2-7 days. If total deposit doesn't reach "minimum deposit" threshold during this period, proposal automatically closes
- **Deposit Handling**: For failed proposals' deposits, system provides flexible strategies (return or burn), depending on preliminary community assessment of proposal quality at this stage

#### 3. Voting Period
Once deposit is met, proposal immediately transitions to the most critical voting phase.
- **Role Participation**: Active validator nodes and regular delegators can participate. To prevent power monopolization, ME Hub adopts improved democratic mechanisms
- **Voting Options**: 
    - **Yes/No**: Express basic support or opposition stance
    - **Abstain**: User participates in governance (helps meet quorum threshold) but doesn't interfere with vote counting results
    - **Strong Opposition (Veto)**: Used to resist malicious proposals, if this voting weight is too high will directly cause proposal failure
- **Power Balance**: Implements "one-person-one-vote" system, ensuring governance rights aren't dominated by staking whales, maintaining core principle of decentralization

#### 4. Vote Counting and Judgment
System automatically conducts multi-dimensional objective assessment of voting results:
- **Quorum**: Requires certain proportion (such as above 33.4%) of all validator nodes to participate in voting, otherwise proposal invalid
- **Veto Risk**: If "strong opposition" vote proportion is too high, proposal not only vetoed but initiator's deposit permanently deducted and burned by system
- **Majority Rule**: Among valid votes after excluding abstentions, yes votes must exceed 50% for proposal to pass

#### 5. Proposal Execution
Once proposal status transitions to "passed", system automatically triggers preset operations through asynchronous logic.
- **Atomic Execution**: Whether parameter adjustments or code logic migration, execution process is atomic. If unexpected technical errors occur during execution, system records failed status and maintains on-chain data consistency
- **State Migration**: Upgrade proposals call preset handlers (Upgrade Handler), completing complex storage library upgrades and data format conversions

## Governance Parameters and Reward Mechanisms

### Core Governance Parameters
To ensure governance efficiency and fairness, system has built-in series of fine-tunable operational parameters:
- **Economic Parameters**: Include minimum deposit amount and initial staking proportion, used to control economic threshold for entering governance process
- **Timing Parameters**: Precisely define duration of deposit period and voting period, seeking balance between security and response speed
- **Judgment Thresholds**: Refined quorum, passage rate, and veto ratio constitute protocol's safety baseline for self-evolution

### Rewards and Penalties
- **Rewards**: Validators actively participating in governance voting and contributors proposing high-quality suggestions receive incentive rewards from community fund pool or protocol fees
- **Penalties**: For submitting malicious proposals or using governance mechanisms to disrupt network order, system confiscates full deposit as warning

## Interaction Method Description
Developers and advanced professional users can query governance status through various methods:
- **On-chain Queries**: Use command-line tools (CLI) to obtain proposal lists, details, voting results, and system parameters in real-time
- **Interface Integration**: Through standard gRPC or REST interfaces, ecosystem applications can seamlessly access governance data, building graphical governance dashboards
- **Governance Tools**: Provide comprehensive notification services and data analysis platforms, helping users track governance dynamics and make rational judgments

## Governance Best Practices
- **Proposers**: Recommend pre-warming discussions in community forums before formally submitting proposals, clearly describing proposal impacts and conducting thorough technical reviews
- **Voters**: Should carefully read proposal descriptions, combined with protocol long-term interests, fairly and justly fulfill voting responsibilities
- **Validators**: Validator nodes as community representatives have duty to maintain high-frequency voting participation rates and transparently communicate voting rationale to delegators

## Governance Best Practices

### For Proposers

1. **Thorough Research**: Research and discuss thoroughly before proposing
2. **Clear Description**: Provide detailed proposal descriptions and rationale
3. **Community Discussion**: Discuss in forums beforehand to get feedback
4. **Technical Review**: Technical proposals require technical review
5. **Impact Assessment**: Assess potential impacts of proposals
6. **Phased Implementation**: Complex changes proposed in phases

### For Voters

1. **Careful Reading**: Carefully read proposal content
2. **Understand Impact**: Understand proposal's impact on protocol
3. **Participate in Discussion**: Express views in community discussions
4. **Timely Voting**: Vote promptly within voting period
5. **Rational Judgment**: Make rational judgments based on protocol interests

### For Validators

1. **Active Participation**: Actively participate in all proposal voting
2. **Transparent Communication**: Explain voting rationale to delegators
3. **Technical Assessment**: Conduct professional assessment of technical proposals
4. **Community Service**: Provide governance guidance for community
5. **Voting Record**: Maintain good voting record

## Governance Tools

### 1. Governance Dashboard

Recommend using following tools to monitor governance activities:

- **Official Explorer**: ME Scan
- **Proposal Tracking**: Real-time tracking of proposal status
- **Voting Statistics**: Visualize voting results
- **Historical Records**: View historical proposals

### 2. Notification Services

Set up proposal notifications:

- Discord/Telegram bots
- Email subscription
- RSS subscription

### 3. Governance Analysis

- **Participation Rate Analysis**: Statistics on validator participation rates
- **Proposal Success Rate**: Analyze proposal passage trends
- **Voting Patterns**: Identify voting patterns and alliances

## Future Development Directions

### 1. Enhanced Governance Functions

- **Quadratic Voting**: Introduce quadratic voting mechanism
- **Delegated Voting**: Allow delegators to directly delegate voting rights to agents
- **Liquid Democracy**: Mix direct and representative voting

### 2. Smart Governance

- **AI-assisted Analysis**: Use AI to analyze proposal impacts
- **Simulation Tools**: Proposal impact simulation
- **Automated Execution**: More automated governance processes

### 3. Cross-chain Governance

- **MBC Governance**: Support cross-chain governance proposals
- **Joint Governance**: Joint governance with other chains
- **Governance Interoperability**: Governance decisions synchronized across chains

### 4. DAO Governance Enhancement

- **Sub-DAOs**: Support more specialized sub-DAOs
- **Multi-signature Governance**: Enhanced multi-signature governance functions
- **Role Permissions**: More fine-grained permission control

## Security Considerations

### 1. Proposal Security

- **Code Review**: Upgrade proposals must undergo code review
- **Testing Verification**: Thoroughly test on testnet
- **Emergency Plans**: Prepare rollback and emergency plans
- **Time Locks**: Set time locks for major changes

### 2. Voting Security

- **Key Security**: Protect voting key security
- **Prevent Manipulation**: Identify and prevent voting manipulation
- **Sybil Attack**: Guard against Sybil attacks
- **Bribery Detection**: Detect voting bribery behavior

### 3. Economic Security

- **Deposit Mechanism**: Reasonably set deposit thresholds
- **Incentive Alignment**: Ensure incentives align with protocol interests
- **Fund Security**: Protect community fund pool security

## Troubleshooting

### Common Issues

**1. Cannot Submit Proposal**

```bash
# Check if deposit is sufficient
med query bank balances <my-address>

# Check proposal format
med tx gov submit-proposal --help
```

**2. Vote Not Taking Effect**

```bash
# Check if voting is within voting period
med query gov proposal <proposal-id>

# Check if have voting rights (whether validator or delegator)
med query staking validators
```

**3. Abnormal Proposal Status**

```bash
# Query detailed status
med query gov proposal <proposal-id> --output json | jq

# Query tally results
med query gov tally <proposal-id>
```

## Reference Materials
### Source Code Reference

- `x/wgov/`: ME Hub enhanced governance module
- `x/wgov/keeper/tally.go`: Tallying logic
- `x/wgov/abci.go`: Proposal execution logic
- `x/dao/`: DAO management module
- `app/upgrades/`: Upgrade handlers

### Community Resources

- GitHub: https://github.com/openmetaearth/me-hub
- Governance Forum: [ME Governance Forum]
- Discord: [ME Community #governance]
- Proposal Templates: [Proposal Templates]

---

**Document Version**: v2.0.0  
**Last Updated**: 2026-02-09  
**Maintainer**: Meta Earth Development Team
