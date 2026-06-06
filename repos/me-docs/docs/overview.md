---
sidebar_position: 2
title: Overview
---

# Overview

Welcome to the Meta Earth documentation repository. This documentation is designed to help different users understand and use Meta Earth from various perspectives.

## What is Meta Earth?

Meta Earth decouples the current popular "monolithic chain" into the execution layer, settlement layer, data availability layer, and consensus layer. By combining modular technology stacks with Rollup[[1]](#rollup-def) as a Service (RaaS), Meta Earth significantly improves the efficiency and convenience of blockchain development, bringing unprecedented scalability to the blockchain network.

Within this framework, Meta Earth's ME Hub is responsible for settlement and state verification consensus functions, while opening up the execution layer's construction capabilities to third parties. Meta Earth provides a series of easy-to-use development components that not only reduce development costs but also simplify the development process, making it simpler, faster, and more efficient. Developers can customize their own Rollup chains according to their needs and build unique ecosystems.

Additionally, we have developed a native on-chain identity system aimed at returning identity sovereignty to users, transferring the power to issue identities to various legitimate institutions, while balancing compliance, privacy protection, and immutability.

## **Developer Documentation Directory**

### **Getting Started for Developers**
- [Network Details](getting-started-for-developers/network-details)
- [Account Details](getting-started-for-developers/account-details)


### **Advanced Development**
- [Overall Architecture](advanced-developer-topics/overall-architecture)
- [Economic Model](advanced-developer-topics/economic-model)
- [Consensus Mechanism](advanced-developer-topics/consensus-mechanism)
- [Governance Mechanism](advanced-developer-topics/governance-mechanism)
- [Account Model](advanced-developer-topics/account-model)
- [MBC](advanced-developer-topics/mbc)
- [Smart Contract Introduction](advanced-developer-topics/smart-contracts-introduction)
- [ME Contributing](contributing-to-me)

### **Development Guide**
- [For Developers](development-guides/for-developers)
- [Rollup](development-guides/developer-guide/rollup)
- [Smart Contracts](development-guides/developer-guide/smart-contract-development)
- [Nodes](development-guides/developer-guide/node-deployment/node)
- [JS SDK](development-guides/developer-guide/js-sdk)
- [MRC Token 20](development-guides/mrc-token/mrc20-token-contract)
- [MRC Token 721](development-guides/mrc-token/mrc721-nft-contract)

### Technology Stack and Terminology

Here we provide a brief description of Meta Earth's technology stack and offer some semantic explanations. More detailed discussions will follow in subsequent chapters.

**ME-Tendermint:** Meta Earth's consensus algorithm is improved and optimized based on Tendermint.

**PPoS:** Permissioned Proof of Stake used by Meta Earth, where validator nodes require permission.

**MBC:** Multi-Blockchain Communication Protocol, a cross-blockchain communication (MBC) protocol based on the ME network, allowing communication and interoperability between various application chains.

**Rollup:** This is a Layer 2 scaling solution that improves the throughput and operational efficiency of the Layer 1 network by transferring transaction computation off-chain. In the ME network, Rollup is responsible for executing transactions and providing compressed transaction data for verification. This eliminates the need to deploy separate validator nodes, as the underlying data availability layer and consensus layer of the ME network can ensure validator security.

**Sequencer:** A sequencer focused on collecting user transactions and processing them in batches.

**ME Hub:** Meta Earth's settlement and state verification consensus layer. It is an independent blockchain network capable of running virtual machines. ME natively supports cross-chain communication for Rollup chains through MBC.

**Rollup Chain:** A Layer 2 chain, the execution layer of Meta Earth. Meta Earth's DA (data availability) layer is responsible for ensuring data validity, while the settlement layer handles disputes and processes and settles cross-chain assets as Layer 1.

**ME-SDK:** A concise and user-friendly blockchain development framework suite containing various modules to help developers quickly customize, develop, and deploy Rollup-chains.

**DID:** Decentralized Identity Identifier, typically referring to decentralized identity.

**Self-Sovereign Identity:** Self-sovereign identity refers to identity with self-sovereignty characteristics. It shares many similarities with Decentralized Identifiers (DID).

**ME-DAO:** ME-DAO refers to the Decentralized Autonomous Organization within the Meta Earth ecosystem.

**Validator:** A validator is a validation node responsible for verifying each transaction and maintaining the security of the distributed ledger.

**Set of Validators:** A validator set is a collection of nodes selected from all nodes. This group of validators is responsible for determining the latest block.

**Staking:** Staking refers to the act of depositing tokens into the network to participate in its consensus mechanism. By staking, participants can earn rewards.

**Full Node:** A full node is a node in the blockchain network responsible for downloading block headers and transaction lists, playing a crucial role in maintaining network consensus.

**DA Light Node:** A light node, also known as a light client, is a node in the blockchain network that only downloads block headers rather than full data. It employs data availability sampling and can detect invalid blocks from intermediate block producers.
