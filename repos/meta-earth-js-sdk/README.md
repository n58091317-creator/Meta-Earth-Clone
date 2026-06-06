# Meta Earth JS SDK

A feature-complete TypeScript SDK for Meta Earth blockchain wallet management, transactions, staking, and governance. Supports both browser and Node.js environments.

## Feature Status

| Module | Implemented Features | Status |
| ------------ | ------------------------------------------------------------ | --------- |
| **Wallet Management** | Mnemonic generation, wallet creation, batch creation, import/export, address conversion, balance query | 100% |
| **Transaction** | Transfer, transaction query, Gas simulation | 100% |
| **Network Info** | Node version query, network status query | 100% |
| **Staking** | Flexible staking, unstake, query delegation, query rewards, claim rewards | 100% |
| **Governance** | Query proposals, submit proposals, vote on proposals | 100% |
| **WASM Contract** | Store code, deploy contract, execute contract, query contract, query by creator/CodeID | 100% |

---

## Quick Start

### Installation

```bash
npm install meta-earth-js-sdk
```

### Browser Environment (ESM)

```typescript
import { MetaEarthSDK } from 'meta-earth-js-sdk'

// Initialize SDK
const sdk = new MetaEarthSDK({
  config: {
    network: 'testnet', // 'testnet' or 'mainnet'
    debug: true,
  },
})

await sdk.initialize()

// Create wallet
const wallet = await sdk.wallet.createMnemonicWallet()
console.log('Address:', wallet.address)
console.log('Mnemonic:', wallet.mnemonic)

// Query balance
const balance = await sdk.transaction.getBalance(wallet.address, 'umec')
console.log('Balance:', balance)

// Transfer
const txHash = await sdk.transaction.transfer({
  fromAddress: wallet.address,
  toAddress: 'metaearth1...',
  amount: { amount: '1000000', denom: 'umec' },
  layer: 'hub',
})
console.log('Transaction Hash:', txHash)
```

### Node.js Environment

```javascript
const { MetaEarthSDK } = require('meta-earth-js-sdk')

async function main() {
  const sdk = new MetaEarthSDK({
    config: { network: 'testnet' },
  })

  await sdk.initialize()

  // Address conversion
  const meAddr = sdk.wallet.convert0xToMeAddress('0x1234...')
  console.log('ME Address:', meAddr)

  // Query node version
  const nodeInfo = await sdk.transaction.getNodeInfo('hub')
  console.log('Node Version:', nodeInfo)
}

main()
```

---

## API Documentation

### SDK Initialization

#### `new MetaEarthSDK(options?)`

Create SDK instance.

```typescript
const sdk = new MetaEarthSDK({
  config: {
    timeout?: number     // Request timeout (default: 10000ms)
    debug?: boolean      // Enable debug logs (default: false)
    network?: Network    // Network type ('testnet' / 'mainnet')
    layer?: Layer        // Default layer ('hub' / 'rollup')
  }
})
```

#### `sdk.initialize()`

Initialize SDK. Must be called before using other methods.

```typescript
await sdk.initialize()
```

---

### Wallet Management (`sdk.wallet`)

#### `createMnemonicWallet(mnemonic?)`

Create or import mnemonic wallet.

```typescript
// Generate new wallet
const wallet = await sdk.wallet.createMnemonicWallet()
// Returns: { address, mnemonic, privateKey }

// Import existing mnemonic
const wallet2 = await sdk.wallet.createMnemonicWallet('word1 word2 ...')
```

#### `createPrivateKeyWallet(privateKey)`

Create wallet from private key.

```typescript
const wallet = await sdk.wallet.createPrivateKeyWallet('0x...')
```

#### `importWallet(data)`

Import wallet (supports mnemonic or private key).

```typescript
const wallet = await sdk.wallet.importWallet({
  mnemonic: '...', // or privateKey: '...'
})
```

#### `convert0xToMeAddress(address)`

Convert 0x format address to ME address.

```typescript
const meAddr = sdk.wallet.convert0xToMeAddress('0x...')
```

#### `convertMeTo0xAddress(address)`

Convert ME address to 0x format.

```typescript
const ethAddr = sdk.wallet.convertMeTo0xAddress('metaearth1...')
```

#### `getWalletAddresses()`

Get all addresses in current wallet.

```typescript
const addresses = sdk.wallet.getWalletAddresses()
```

#### `getBalance(address, layer?)`

Query address balance.

```typescript
const balance = await sdk.wallet.getBalance('metaearth1...', 'hub')
```

**API Endpoint**: `/cosmos/bank/v1beta1/balances/${address}`

#### `getNodeVersion(layer?)`

Query node version info.

```typescript
const nodeVersion = await sdk.wallet.getNodeVersion('hub')
```

**API Endpoint**: `/abci_info` (RPC)

#### `getNetworkStatus(layer?)`

Query network status info.

```typescript
const status = await sdk.wallet.getNetworkStatus('hub')
```

**API Endpoint**: `/status` (RPC)

---

### Transaction Operations (`sdk.transaction`)

#### `transfer(params)`

Send transfer transaction (supports HUB and Rollup layers).

```typescript
const txHash = await sdk.transaction.transfer({
  fromAddress: 'metaearth1...',
  toAddress: 'metaearth1...',
  amount: [{ amount: '1000000', denom: 'umec' }],
  layer: 'hub', // or 'rollup'
})
```

#### `getTransaction(hash, layer?)`

Query transaction details by hash.

```typescript
const tx = await sdk.transaction.getTransaction('ABC123...', 'hub')
```

**API Endpoint**: `/cosmos/tx/v1beta1/txs/${hash}`

#### `simulateGas(params)`

Simulate transaction to estimate Gas fees.

```typescript
const result = await sdk.transaction.simulateGas({
  tx_bytes: txBytesBase64,
})
console.log('Estimated Gas:', result.gas_info.gas_used)
```

**API Endpoint**: `/cosmos/tx/v1beta1/simulate`

---

### Staking (`sdk.staking`)

#### `stakeFlexible(params)`

Flexible staking (HUB layer).

```typescript
const txHash = await sdk.staking.stakeFlexible({
  address: 'metaearth1...',
  amount: { amount: '1000000', denom: 'umec' },
  layer: 'hub',
})
```

#### `unstakeFlexible(params)`

Unstake flexible staking (HUB layer).

```typescript
const txHash = await sdk.staking.unstakeFlexible({
  address: 'metaearth1...',
  amount: { amount: '1000000', denom: 'umec' },
  layer: 'hub',
})
```

#### `getFlexibleDelegation(delegatorAddr, layer?)`

Query flexible delegation.

```typescript
const delegation = await sdk.staking.getFlexibleDelegation('metaearth1...', 'hub')
```

**API Endpoint**: `/metaearth/wstaking/delegation/{delegator_addr}`

#### `getFlexibleDelegationRewards(delegatorAddr, layer?)`

Query flexible delegation rewards.

```typescript
const rewards = await sdk.staking.getFlexibleDelegationRewards('metaearth1...', 'hub')
```

**API Endpoint**: `/metaearth/wstaking/delegation-rewards/{delegator_address}`

#### `claimStakingReward(address)`

Claim flexible staking rewards (HUB layer).

```typescript
const txHash = await sdk.staking.claimStakingReward('metaearth1...')
```

---

### Governance (`sdk.governance`)

#### `getProposals(status?, layer?)`

Query current proposals (HUB layer, using SDK V1 endpoint).

```typescript
import { ProposalStatus } from 'meta-earth-js-sdk'

// Query all proposals
const allProposals = await sdk.governance.getProposals()

// Query by status
const votingProposals = await sdk.governance.getProposals(
  ProposalStatus.PROPOSAL_STATUS_VOTING_PERIOD,
)
```

**API Endpoint**: `/cosmos/gov/v1/proposals`

**Supported Proposal Statuses**:

- `PROPOSAL_STATUS_UNSPECIFIED`
- `PROPOSAL_STATUS_DEPOSIT_PERIOD`
- `PROPOSAL_STATUS_VOTING_PERIOD`
- `PROPOSAL_STATUS_PASSED`
- `PROPOSAL_STATUS_REJECTED`
- `PROPOSAL_STATUS_FAILED`

#### `submitSoftwareUpgradeProposal(params)`

Submit a software upgrade proposal.

```typescript
const txHash = await sdk.governance.submitSoftwareUpgradeProposal({
  proposer: 'mec1...',
  content: {
    title: 'Upgrade to v2.0.0',
    description: 'Upgrade description...',
    plan: {
      name: 'v2.0.0',
      height: 1000000,
      info: 'Upgrade details',
    },
  },
  initialDeposit: [{ denom: 'umec', amount: '100000000' }],
})
console.log('Transaction Hash:', txHash)
```

#### `voteProposal(params)`

Vote on a proposal.

```typescript
const txHash = await sdk.governance.voteProposal({
  proposalId: 1,
  voter: 'mec1...',
  option: 'yes', // 'yes' | 'no' | 'abstain' | 'no_with_veto'
})
console.log('Transaction Hash:', txHash)
```

---

### Contract Operations (`sdk.contract`)

#### `storeCode(params)`

Store WASM contract code on chain.

```typescript
const txHash = await sdk.contract.storeCode({
  sender: 'me1...',
  wasmByteCode: wasmBytes, // Uint8Array or base64 string
  layer: 'wasm',
})
console.log('Transaction Hash:', txHash)
```

#### `deployContract(params)`

Instantiate contract (MsgInstantiateContract).

```typescript
const txHash = await sdk.contract.deployContract({
  sender: 'me1...',
  codeId: 1,
  label: 'My Contract',
  initMsg: { name: 'Token', symbol: 'TKN' },
  admin: 'me1...', // optional
  funds: [], // optional
  layer: 'wasm',
})
```

#### `executeContract(params)`

Execute contract method (MsgExecuteContract).

```typescript
const txHash = await sdk.contract.executeContract({
  sender: 'me1...',
  contractAddress: 'me1...',
  msg: { transfer: { recipient: 'me1...', amount: '1000000' } },
  funds: [{ denom: 'umec', amount: '1000000' }], // optional
  layer: 'wasm',
})
```

#### `getCodeIdByHash(dataHash, layer?)`

Find existing Code ID on chain by WASM code SHA256 hash.

```typescript
// Calculate hash of local WASM file
const hash = 'A87926C34CF2D4C7E8D85C8F09853351207170CEDAE18AC8D69AEBEAF2864954'

// Check if code already exists on chain
const codeId = await sdk.contract.getCodeIdByHash(hash)
if (codeId) {
  console.log('Existing Code ID:', codeId)
} else {
  console.log('Need to store code first')
}
```

**API Endpoint**: `/cosmwasm/wasm/v1/code`

#### `getContractsByCodeId(codeId, layer?)`

Query all contract addresses using specified Code ID.

```typescript
const result = await sdk.contract.getContractsByCodeId(28)
console.log('Contract List:', result.contracts)
// ['me1...', 'me1...', ...]
```

**API Endpoint**: `/cosmwasm/wasm/v1/code/{code_id}/contracts`

#### `getContractsByCreator(creatorAddress, layer?)`

Query all contract addresses created by specified creator.

```typescript
const result = await sdk.contract.getContractsByCreator('me1...')
console.log('Contract List:', result.contract_addresses)
// ['me1...', 'me1...', ...]
```

**API Endpoint**: `/cosmwasm/wasm/v1/contracts/creator/{creator_address}`

#### `queryContractSmart(contractAddress, queryData, layer?)`

Query contract state (Smart Query). Query data will be automatically base64 encoded.

```typescript
// Query contract config
const result = await sdk.contract.queryContractSmart(
  'me1xnl29l92rt8y76fqvukz8al373h4ld3wwn58g6m0tazgwzgcp7mqjaypfn',
  { get_config: {} },
)
console.log('Contract Config:', result.data)

// Query specific candy info
const candy = await sdk.contract.queryContractSmart('me1...', { get_candy: { candy_id: 1 } })
console.log('Candy Info:', candy.data)
```

**API Endpoint**: `/cosmwasm/wasm/v1/contract/{contractAddress}/smart/{query_data}`

---

## Utility Functions

### Environment Detection

```typescript
import { isBrowser, isNode, detectEnvironment } from 'meta-earth-js-sdk'

if (isBrowser()) {
  console.log('Running in browser')
}

console.log('Environment:', detectEnvironment()) // 'browser' or 'node'
```

### Logger

```typescript
import { Logger } from 'meta-earth-js-sdk'

const logger = new Logger({ enabled: true })
logger.info('Log message')
logger.error('Error message')
```

---

## React Demo App

The project includes a complete React + TypeScript demo application showcasing all implemented features.

### Run Demo

```bash
cd examples/react-demo
npm install
npm run dev
```

Visit http://localhost:5173

### Demo Features

- **Wallet Management Panel** - Create, import, address conversion
- **Query Panel** - Balance query, transaction query, node info
- **Transaction Panel** - HUB and Rollup layer transfers
- **Staking Panel** - Stake, unstake, query delegation, query rewards, claim rewards
- **Governance Panel** - Query proposals (V1)
- **Contract Panel** - Store code, instantiate contract, execute contract
- **Real-time Log System** - View all operation logs

---

## Best Practices

### 1. Network Switching

```typescript
const sdk = new MetaEarthSDK({
  config: { network: 'testnet' }, // Default to testnet
})

await sdk.initialize()

// Switch to mainnet
sdk.setNetwork('mainnet')
```

### 2. Error Handling

```typescript
try {
  const txHash = await sdk.transaction.transfer({
    fromAddress: 'metaearth1...',
    toAddress: 'metaearth1...',
    amount: { amount: '1000000', denom: 'umec' },
    layer: 'hub',
  })
  console.log('Transfer successful:', txHash)
} catch (error) {
  console.error('Transfer failed:', error.message)
}
```

### 3. Debug Mode

```typescript
const sdk = new MetaEarthSDK({
  config: {
    debug: true, // Enable detailed logs
  },
})

await sdk.initialize()

// View SDK version
console.log('SDK Version:', sdk.getVersion())

// View current network
console.log('Current Network:', sdk.getCurrentNetwork())

// View environment
console.log('Environment:', sdk.getEnvironment())
```

---

## FAQ

### Q: Which networks does the SDK support?

**A**: Supports Meta Earth testnet (`testnet`) and mainnet (`mainnet`). Defaults to testnet.

### Q: What is a Layer?

**A**: Meta Earth blockchain has two layers:

- `hub`: HUB layer, main chain
- `rollup`: Rollup layer, application chain

Most operations execute on the HUB layer by default.

### Q: How to get test tokens?

**A**: Please contact the Meta Earth team to obtain testnet tokens.

### Q: Can I use this in production?

**A**: Yes. All implemented features have been tested, but we recommend thorough testing on testnet before deploying to mainnet.

### Q: What contract operations are supported?

**A**: Currently supports the complete WASM contract lifecycle:

- `storeCode` - Store contract code
- `deployContract` - Instantiate contract
- `executeContract` - Execute contract
- `getCodeIdByHash` - Find Code ID by hash

---

## Architecture

### Module Structure

```
src/
├── sdk.ts                    # Main SDK class
├── modules/                  # Feature modules
│   ├── wallet/
│   │   └── service.ts       # Wallet service
│   ├── transaction/
│   │   └── service.ts       # Transaction service
│   ├── staking/
│   │   └── service.ts       # Staking service
│   ├── governance/
│   │   └── service.ts       # Governance service
│   └── contract/
│       └── service.ts       # Contract service
├── api/                     # API layer
│   ├── wallet.ts
│   ├── transaction.ts
│   ├── staking.ts
│   ├── governance.ts
│   └── types.ts            # API type definitions
├── types/                   # Type definitions
│   ├── base.ts
│   ├── wallet.ts
│   ├── transaction.ts
│   ├── staking.ts
│   └── governance.ts
└── utils/                   # Utility functions
    ├── http-client.ts
    ├── logger.ts
    └── environment.ts
```

### Tech Stack

- **Language**: TypeScript 5.3+
- **Build**: Vite 5.0 + Rollup
- **Blockchain**: @cosmjs/\* (0.31.3)
- **Cryptography**: ethers.js ^6.15.0, secp256k1, bip39
- **Testing**: Vitest
- **UI Demo**: React + Ant Design 6.0

---

## Development Guide

### Install Dependencies

```bash
npm install
# or
pnpm install
```

### Build SDK

```bash
npm run build

# Output:
# - dist/index.js (ESM format)
# - dist/index.d.ts (Type declarations)
```

### Development Mode

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

### Type Check

```bash
npm run type-check
```

---

## Blockchain Module Integration

SDK integrates the following blockchain modules:

### Cosmos SDK Standard Modules

- `cosmos.auth`, `cosmos.bank`, `cosmos.staking`
- `cosmos.gov`, `cosmos.distribution`, `cosmos.slashing`
- etc...

### IBC Modules

- `ibc.core.channel`, `ibc.core.client`, `ibc.core.connection`
- `ibc.applications.transfer`

### EVM Modules

- `ethermint.evm.v1`, `ethermint.feemarket.v1`

### Meta Earth Custom Modules

- `metaearth.dao`, `metaearth.did`, `metaearth.kyc`
- `metaearth.wstaking`, `metaearth.wdistri`, `metaearth.wnft`
- etc...
