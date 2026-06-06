---
sidebar_position: 2
title: Smart Contract Development
---

# Meta Earth Smart Contract Development Guide

## 1. WASM Introduction

WASM refers to the entire ecosystem built around it, with a mission to make smart contract development easy and reliable. The WASM platform focuses on security, performance, and interoperability. It's designed for tight integration with Cosmos SDK and building MBC contracts, with Rust as the development stack. Communication between two smart contracts on the same chain is very easy - the WASM standard library provides simple tools for communicating with non-WASM modules on-chain, including common Cosmos modules (like bank or staking) and any chain-specific custom modules. Finally, WASM is built on MBC and provides a simple API for communicating with other chains and contracts using MBC-based protocols.

## 2. Environment Setup

### 2.1 Install Rust and Cargo

Also refer to the [Official Rust Guide](https://www.rust-lang.org/)

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

> 📌 **Important Note**: Don't use too new Rust versions, as WASM VM updates aren't that fast. Recommended versions: **1.75.0-1.80.0**. If you've installed the latest Rust, set the `[toolchain]` option correctly in `rust-toolchain.toml`.

### 2.2 Verify Rust Installation

```bash
# Check installation
rustc --version
cargo --version

# If command fails, manually refresh terminal
source $HOME/.cargo/env
```

### 2.3 Compilation Environment

#### 2.3.1 Essential Tools [Required]

```bash
# Install cargo-generate
cargo install cargo-generate

# Install optimization tools
cargo install cargo-run-script

# Add WASM32 target: Add WebAssembly compilation target to Rust compiler
rustup target add wasm32-unknown-unknown

# Verify installation
rustup target list | grep wasm32-unknown-unknown
# Output: wasm32-unknown-unknown (installed)
```

#### 2.3.2 Optional Tools

```bash
# Optional install for simpler contract compilation
cargo install cargo-wasm  

# WASM optimization tool (wasm-opt)
# macOS
brew install binaryen

# Ubuntu/Debian
sudo apt install binaryen

# Or install via cargo (cross-platform)
cargo install wasm-opt
```

#### 2.3.3 Docker Installation [Required]

Docker compilation strongly recommended for deployment. If Docker isn't installed:

**macOS:**

```bash
# Method 1: Using Homebrew (recommended)
brew install --cask docker

# Method 2: Download Docker Desktop
# https://www.docker.com/products/docker-desktop
```

**Linux:**

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER  # Add current user to docker group
# Re-login for permissions to take effect

# Or use package manager
sudo apt install docker.io
sudo systemctl start docker
sudo systemctl enable docker
```

**Verify:**

```bash
docker --version
# Output: Docker version 24.x.x

docker run hello-world
# Successful run indicates correct Docker installation
```

## 3. Contract Development

### 3.1 Create Contract

#### 3.1.1 Using Official Template (Recommended)

```bash
# HTTPS method (no SSH key needed)
cargo generate --git https://github.com/wasm/cw-template.git --name my_contract

# SSH method (requires GitHub SSH key)
cargo generate --git git@github.com:wasm/cw-template.git --name my_contract
```

**Parameter Description:**

- `cargo generate`: Rust project template generation tool
- `--git`: Specify Git repository URL as template source
- `git@github.com:wasm/cw-template.git`: WASM official template repository (SSH address)
- `--name my_contract`: New project name

#### 3.1.2 Manual Creation (Not Recommended)

**Step 1: Create Rust Library Project**

```bash
# Create new Rust library project
cargo new --lib my_contract
cd my_contract
```

**Step 2: Configure Cargo.toml**

```toml
[package]
name = "my_contract"
version = "0.1.1"
edition = "2021"

# Key configuration: Generate wasm dynamic library and Rust library
[lib]
crate-type = ["cdylib", "rlib"]

# Schema generation tool
[[bin]]
name = "schema"
path = "src/bin/schema.rs"

# Release optimization configuration
[profile.release]
opt-level = 3            # Maximum optimization level
debug = false            # No debug info
lto = true               # Enable link-time optimization
codegen-units = 1        # Single code generation unit (better optimization)
panic = 'abort'          # Abort on panic, don't unwind stack
overflow-checks = true   # Keep overflow checks (safety)

# Dependencies
[dependencies]
wasm-std = "1.5.0"      # WASM standard library
wasm-schema = "1.5.0"   # Schema generation
schemars = "0.8"            # JSON Schema
serde = { version = "1.0", default-features = false, features = ["derive"] }
thiserror = "1.0"           # Error handling

[dev-dependencies]
cw-multi-test = "0.20.0"    # Multi-contract testing framework
```

**Step 3: Create Basic Code Structure**

**lib.rs (library entry):**

```rust
pub mod contract;
pub mod error;
pub mod msg;
pub mod state;

#[cfg(test)]
mod tests;
```

**msg.rs (message definitions):**

```rust
use wasm_schema::{cw_serde, QueryResponses};

#[cw_serde]
pub struct InstantiateMsg {
    pub count: i32,
}

#[cw_serde]
pub enum ExecuteMsg {
    Increment {},
    Reset { count: i32 },
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    #[returns(GetCountResponse)]
    GetCount {},
}

#[cw_serde]
pub struct GetCountResponse {
    pub count: i32,
}
```

**state.rs (state management):**

```rust
use wasm_schema::cw_serde;
use wasm_std::Addr;
use cw_storage_plus::Item;

#[cw_serde]
pub struct State {
    pub count: i32,
    pub owner: Addr,
}

pub const STATE: Item<State> = Item::new("state");
```

**error.rs (error definitions):**

```rust
use wasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),
    
    #[error("Unauthorized")]
    Unauthorized {},
    
    #[error("Custom Error val: {val:?}")]
    CustomError { val: String },
}
```

**contract.rs (main contract logic):**

```rust
use wasm_std::{
    entry_point, to_json_binary, Binary, Deps, DepsMut, Env, 
    MessageInfo, Response, StdResult,
};
use crate::error::ContractError;
use crate::msg::{ExecuteMsg, InstantiateMsg, QueryMsg, GetCountResponse};
use crate::state::{State, STATE};

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    let state = State {
        count: msg.count,
        owner: info.sender.clone(),
    };
    STATE.save(deps.storage, &state)?;
    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("owner", info.sender)
        .add_attribute("count", msg.count.to_string()))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Increment {} => execute_increment(deps),
        ExecuteMsg::Reset { count } => execute_reset(deps, info, count),
    }
}

pub fn execute_increment(deps: DepsMut) -> Result<Response, ContractError> {
    STATE.update(deps.storage, |mut state| -> Result<_, ContractError> {
        state.count += 1;
        Ok(state)
    })?;
    Ok(Response::new().add_attribute("action", "increment"))
}

pub fn execute_reset(
    deps: DepsMut,
    info: MessageInfo,
    count: i32,
) -> Result<Response, ContractError> {
    STATE.update(deps.storage, |mut state| -> Result<_, ContractError> {
        if info.sender != state.owner {
            return Err(ContractError::Unauthorized {});
        }
        state.count = count;
        Ok(state)
    })?;
    Ok(Response::new().add_attribute("action", "reset"))
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetCount {} => to_json_binary(&query_count(deps)?),
    }
}

fn query_count(deps: Deps) -> StdResult<GetCountResponse> {
    let state = STATE.load(deps.storage)?;
    Ok(GetCountResponse { count: state.count })
}

#[cfg(test)]
mod tests {
    use super::*;
    use wasm_std::testing::{mock_dependencies, mock_env, mock_info};
    use wasm_std::{coins, from_json};

    #[test]
    fn proper_initialization() {
        let mut deps = mock_dependencies();
        let msg = InstantiateMsg { count: 17 };
        let info = mock_info("creator", &coins(1000, "earth"));
        let res = instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();
        assert_eq!(0, res.messages.len());

        let res = query(deps.as_ref(), mock_env(), QueryMsg::GetCount {}).unwrap();
        let value: GetCountResponse = from_json(&res).unwrap();
        assert_eq!(17, value.count);
    }
}
```

**Step 4: Add Necessary Configuration Files**

**Create `.cargo/config.toml`:**

```toml
[alias]
wasm = "build --release --lib --target wasm32-unknown-unknown"
schema = "run --bin schema"

[build]
target = "wasm32-unknown-unknown"

[target.wasm32-unknown-unknown]
rustflags = [
  "-C", "link-arg=-s",  # Strip symbol table
]
```

**Create `rust-toolchain.toml`:**

```toml
[toolchain]
channel = "1.75.0"
```

**Create `src/bin/schema.rs` (Schema generation tool):**

```rust
use wasm_schema::write_api;
use my_contract::msg::{ExecuteMsg, InstantiateMsg, QueryMsg};

fn main() {
    write_api! {
        instantiate: InstantiateMsg,
        execute: ExecuteMsg,
        query: QueryMsg,
    }
}
```

### 3.2 Compilation

#### 3.2.1 Code Checks and Optimization

```bash
# Format code
cargo fmt --check 

# Check code quality 
cargo clippy --all-targets --all-features -- -D warnings 

# Run tests (verify contract logic correctness)
cargo test --lib

# Generate JSON Schema (generate contract interface documentation)
cargo schema
# Generates schema files in schema/ directory
```

#### 3.2.2 Local Compilation (Development/Testing)

**Method 1: Using cargo wasm command**

```bash
cargo wasm
# Output: target/wasm32-unknown-unknown/release/my_contract.wasm
```

**Method 2: Manual compilation with optimization**

```bash
# Set RUSTFLAGS for size optimization
RUSTFLAGS='-C link-arg=-s' cargo build --release --lib --target=wasm32-unknown-unknown

# Optional: Further optimize with wasm-opt
wasm-opt -Os target/wasm32-unknown-unknown/release/my_contract.wasm \
  -o target/wasm32-unknown-unknown/release/my_contract_optimized.wasm

# View WASM file size
ls -lh target/wasm32-unknown-unknown/release/*.wasm
```

**Compilation flags explained:**

- `RUSTFLAGS='-C link-arg=-s'`: Strip symbol table to reduce file size
- `--release`: Use release mode (optimizations enabled)
- `--lib`: Only build library (not binaries)
- `--target=wasm32-unknown-unknown`: WebAssembly compilation target

#### 3.2.3 Docker Compilation (Production - Strongly Recommended)

**Why use Docker for production?**

1. **Consistent Environment**: Ensures all developers and CI/CD use identical compilation environment
2. **Deterministic Builds**: Same code always generates identical WASM binary (important for on-chain verification)
3. **Optimal Optimization**: Docker image includes all optimization tools and best practices
4. **No Local Dependencies**: No need to install/configure local optimization tools

**Method 1: Using cargo-run-script**

First add to `Cargo.toml`:

```toml
[package.metadata.scripts]
optimize = """docker run --rm -v "$(pwd)":/code \
  --mount type=volume,source="$(basename "$(pwd)")_cache",target=/code/target \
  --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
  wasm/optimizer:0.17.0"""
```

Then run:

```bash
cargo run-script optimize
# Output: artifacts/my_contract.wasm
```

**Method 2: Direct Docker command**

```bash
docker run --rm -v "$(pwd)":/code \
  --mount type=volume,source="$(basename "$(pwd)")_cache",target=/code/target \
  --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
  wasm/optimizer:0.17.0
```

**Docker command detailed explanation:**

- `docker run`: Run Docker container
- `--rm`: Automatically remove container after completion (cleanup)
- `-v "$(pwd)":/code`: Mount current directory to container's /code directory (source code mapping)
- `--mount type=volume,source="...cache",target=/code/target`: Create named volume to cache compilation artifacts (speeds up subsequent compilations)
- `--mount type=volume,source=registry_cache,target=/usr/local/cargo/registry`: Cache Cargo registry dependencies (avoid redownloading dependencies)
- `wasm/optimizer:0.17.0`: Docker image name and version (official WASM optimization image containing Rust toolchain and optimization tools)

**Compilation output:**

```bash
# View artifacts directory
ls -lh artifacts/

# Output example:
# -rw-r--r--  1 user  staff   150K  my_contract.wasm      # Optimized WASM file
# -rw-r--r--  1 user  staff    12K  checksums.txt          # File checksums
```

**Optimization results comparison:**

| Compilation Method | File Size | Suitable For |
|-------------------|-----------|-------------|
| cargo build | ~2.5 MB | Development/debugging |
| cargo wasm | ~800 KB | Local testing |
| Docker optimizer | ~150 KB | Production deployment |

## 4. Contract Deployment

### 4.1 Deployment Workflow

Complete contract lifecycle:

```
1. Upload WASM → 2. Instantiate → 3. Execute → 4. Query
     ↓                 ↓              ↓           ↓
  Code ID        Contract Addr   State Change  Read State
```

### 4.2 Upload WASM Code

```bash
# Upload compiled WASM file (get code_id for subsequent instantiation)
med tx wasm store "artifacts/my_contract.wasm" \
  --from <your-key-name> \
  --home ./.mechain/ \
  --fees 100000000umec \
  --gas auto \
  --gas-adjustment 1.3

# Check transaction result (obtain code_id from transaction details)
# Or query latest code_id
med query wasm list-code --node <rpc-url>
```

**Transaction result:**

After execution, get `code_id` from transaction details:

```yaml
attributes:
  - index: true
    key: code_checksum
    value: 719fc7dbbe89286f2a72541f62fae0cddfb404637ad515528b18498296243b9a
  - index: true
    key: code_id
    value: "1"   # This is the code_id needed for instantiation
```

### 4.3 Instantiate Contract

```bash
# med tx wasm instantiate {code-id} {init-msg} [flags]
med tx wasm instantiate 1 \
  '{"count":911}' \
  --label "test_contract" \
  --amount 100000000umec \
  --admin <admin-address> \
  --from <your-key-name> \
  --home ./.mechain/ \
  --fees 10000umec \
  --gas auto
```

**Parameter description:**

- `1`: code_id (from upload step)
- `'{"count":911}'`: Initialization parameters (JSON format, must match contract's InstantiateMsg)
- `--label`: Contract label (for identification, can be any string)
- `--amount`: MEC tokens sent with instantiation (if contract requires initial funds)
- `--admin`: Admin address (for contract upgrades, optional)

**Transaction result:**

After successful execution, get `_contract_address` from transaction details:

```yaml
attributes:
  - index: true
    key: _contract_address
    value: me14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9sc0nehr
  - index: true
    key: code_id
    value: "1"
```

**Record contract address:**

```bash
# Save contract address (needed for subsequent calls)
CONTRACT_ADDR="me14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9sc0nehr"
```

### 4.4 Execute Contract Functions

```bash
# med tx wasm execute {contract-address} {execute-msg} [flags]

# Example 1: Increment counter
med tx wasm execute ${CONTRACT_ADDR} \
  '{"increment":{}}' \
  --from <your-key-name> \
  --home ./.mechain/ \
  --fees 10000umec \
  --gas auto

# Example 2: Reset counter (requires authorization)
med tx wasm execute ${CONTRACT_ADDR} \
  '{"reset":{"count":0}}' \
  --from <owner-key-name> \
  --home ./.mechain/ \
  --fees 10000umec \
  --gas auto
```

**Execute message format description:**

Execute messages must match contract's `ExecuteMsg` enum definition:

```rust
// Contract definition
pub enum ExecuteMsg {
    Increment {},           // → JSON: {"increment":{}}
    Reset { count: i32 },   // → JSON: {"reset":{"count":0}}
}
```

### 4.5 Query Contract State

#### Method 1: Smart Query (JSON format)

```bash
# med q wasm contract-state smart {contract-address} {query-msg}

# Query counter value
med q wasm contract-state smart ${CONTRACT_ADDR} \
  '{"get_count":{}}'

# Output example:
# data:
#   count: 911
```

**Query message format:**

Must match contract's `QueryMsg` definition:

```rust
pub enum QueryMsg {
    #[returns(GetCountResponse)]
    GetCount {},            // → JSON: {"get_count":{}}
}
```

#### Method 2: Query All States

```bash
# Query all contract state variables (debugging tool)
med q wasm contract-state all ${CONTRACT_ADDR}

# Output:
# models:
# - key: 73746174653a3...  # hex encoded key
#   value: 7b22636f756...   # hex encoded value
```

#### Method 3: Raw Query (hex key)

```bash
# Query specific storage key (low-level operation)
med q wasm contract-state raw ${CONTRACT_ADDR} <hex-key>

# Convert key to hex first
echo -n "state" | xxd -p
# Output: 7374617465

med q wasm contract-state raw ${CONTRACT_ADDR} 7374617465
```

### 4.6 Query Contract Information

```bash
# Query contract metadata (code_id, creator, admin, etc.)
med q wasm contract ${CONTRACT_ADDR}

# Output example:
address: me14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9sc0nehr
contract_info:
  admin: me12s89yty5t0ed8vhx2l9xmcp6pwh2d8tfhtdwsk
  code_id: "1"
  created: null
  creator: me12s89yty5t0ed8vhx2l9xmcp6pwh2d8tfhtdwsk
  MBC_port_id: ""
  label: test_contract

# Query code info (get WASM code checksum and creator)
med q wasm code 1

# Query contract history (view all upgrade records)
med q wasm contract-history ${CONTRACT_ADDR}
```

## 5. Contract Upgrade and Migration

### 5.1 Upgrade System Overview

WASM contracts support on-chain upgrades, allowing contract code updates **without changing the contract address**. This means:

- ✅ **Keep same address**: Users and other contracts don't need to update references
- ✅ **Preserve state**: Contract storage data retained after upgrade
- ✅ **Controlled process**: Only admin can execute upgrades
- ✅ **State migration**: Can modify data structures during upgrade

### 5.2 Implement Migrate Entry Point

#### Add MigrateMsg Definition

**msg.rs:**

```rust
use wasm_schema::cw_serde;

#[cw_serde]
pub struct MigrateMsg {
    // Can be empty struct (simple upgrade, no data changes)
}

// Or include migration parameters:
#[cw_serde]
pub struct MigrateMsg {
    pub new_field: Option<String>,
    pub description: String,
}
```

#### Implement migrate Function

**contract.rs:**

```rust
use crate::msg::MigrateMsg;

// Simple migration (no state changes, only code update)
#[entry_point]
pub fn migrate(
    _deps: DepsMut,
    _env: Env,
    _msg: MigrateMsg,
) -> Result<Response, ContractError> {
    Ok(Response::default())
}
```

**Migration with version management (recommended):**

```rust
use cw2::{get_contract_version, set_contract_version};

#[entry_point]
pub fn migrate(
    deps: DepsMut,
    _env: Env,
    msg: MigrateMsg,
) -> Result<Response, ContractError> {
    // 1. Get current version
    let ver = get_contract_version(deps.storage)?;
    
    // 2. Verify contract name matches
    if ver.contract != env!("CARGO_PKG_NAME") {
        return Err(ContractError::InvalidContract {});
    }
    
    // 3. Version check: only allow specific version upgrades
    if !ver.version.starts_with("0.1.") {
        return Err(ContractError::InvalidMigrationVersion {
            current: ver.version,
        });
    }
    
    // 4. Execute migration logic (if state structure changed)
    // ... data migration code ...
    
    // 5. Update version info
    let new_version = env!("CARGO_PKG_VERSION");
    set_contract_version(deps.storage, env!("CARGO_PKG_NAME"), new_version)?;
    
    Ok(Response::new()
        .add_attribute("method", "migrate")
        .add_attribute("from_version", ver.version)
        .add_attribute("to_version", new_version))
}
```

**State structure change migration:**

If `State` struct changed between versions:

```rust
// Old state (v0.1.0)
#[cw_serde]
pub struct StateV1 {
    pub count: i32,
    pub owner: Addr,
}

// New state (v0.2.0)
#[cw_serde]
pub struct State {
    pub count: i32,
    pub owner: Addr,
    pub description: String,  // New field
}

// Migration function
pub fn migrate(
    deps: DepsMut,
    _env: Env,
    msg: MigrateMsg,
) -> Result<Response, ContractError> {
    // Load old state
    let old_state: StateV1 = OLD_STATE.load(deps.storage)?;
    
    // Convert to new state
    let new_state = State {
        count: old_state.count,
        owner: old_state.owner,
        description: msg.description,  // From migration message
    };
    
    // Save new state
    STATE.save(deps.storage, &new_state)?;
    
    // Update version
    set_contract_version(deps.storage, env!("CARGO_PKG_NAME"), "0.2.0")?;
    
    Ok(Response::default())
}
```

#### Add cw2 Dependency

**Cargo.toml:**

```toml
[dependencies]
cw2 = "1.0"  # Contract version management
```

#### Initialize Version in instantiate

```rust
use cw2::set_contract_version;

const CONTRACT_NAME: &str = env!("CARGO_PKG_NAME");
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    // Set initial version
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    
    // ... rest of instantiation logic ...
}
```

#### Update Schema Generation

**src/bin/schema.rs:**

```rust
use wasm_schema::write_api;
use my_contract::msg::{ExecuteMsg, InstantiateMsg, QueryMsg, MigrateMsg};

fn main() {
    write_api! {
        instantiate: InstantiateMsg,
        execute: ExecuteMsg,
        query: QueryMsg,
        migrate: MigrateMsg,  // Add migrate message to schema
    }
}
```

### 5.3 Execute Upgrade

**Complete upgrade workflow:**

**Step 1: Update Cargo.toml version**

```toml
[package]
name = "my_contract"
version = "0.2.0"  # Increment version number
edition = "2021"
```

**Step 2: Compile new contract**

```bash
# Use Docker optimization compilation (recommended)
docker run --rm -v "$(pwd)":/code \
  --mount type=volume,source="$(basename "$(pwd)")_cache",target=/code/target \
  --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
  wasm/optimizer:0.17.0

# Compilation artifacts in artifacts/ directory
ls artifacts/
# Output: my_contract.wasm
```

**Step 3: Upload new contract code**

```bash
# Upload new version WASM file
med tx wasm store "artifacts/my_contract.wasm" \
  --from user \
  --home ./.mechain/ \
  --fees 1000000umec \
  --gas auto

# Record returned code_id (assume it's 2)
```

**Transaction result:**

After execution, get new `code_id` from transaction details:

```yaml
attributes:
  - index: true
    key: code_checksum
    value: 719fc7dbbe89286f2a72541f62fae0cddfb404637ad515528b18498296243b9a
  - index: true
    key: code_id
    value: "2"   # New code_id
```

**Step 4: Execute contract migration**

```bash
# med tx wasm migrate {contract-address} {new-code-id} {migrate-msg}
med tx wasm migrate \
  me14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9sc0nehr \
  2 \
  '{}' \
  --from me12s89yty5t0ed8vhx2l9xmcp6pwh2d8tfhtdwsk \
  --gas auto \
  --fees 10000umec \
  --home .mechain/
```

**Command parameter explanation:**

- `migrate`: Identifies this command as contract migration/upgrade
- `me14hj2tavq8f...`: Contract address to upgrade (address unchanged)
- `2`: New code_id (from step 3)
- `'{}'`: Parameters passed to migrate function (JSON format, empty object if no parameters)
- `--from`: Must be contract's admin address

If migration parameters needed:

```bash
med tx wasm migrate \
  me14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9sc0nehr \
  2 \
  '{"new_description":"Upgraded to v2 with new features"}' \
  --from me12s89yty5t0ed8vhx2l9xmcp6pwh2d8tfhtdwsk \
  --gas auto \
  --fees 10000umec \
  --home .mechain/
```

Successful migration return info:

```yaml
attributes:
  - key: _contract_address
    value: me14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9sc0nehr
  - key: method
    value: migrate
  - key: old_version
    value: "0.1.0"
  - key: new_version
    value: "0.2.0"
```

**Step 5: Verify upgrade result**

**1. Query contract info (verify code_id updated):**

```bash
med q wasm contract \
  me14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9sc0nehr
```

Return example:

```yaml
address: me14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9sc0nehr
contract_info:
  admin: me12s89yty5t0ed8vhx2l9xmcp6pwh2d8tfhtdwsk
  code_id: "2"  # Updated to new code_id
  created: null
  creator: me12s89yty5t0ed8vhx2l9xmcp6pwh2d8tfhtdwsk
  MBC_port_id: ""
  label: test_contract
```

**2. Query contract version info:**

```bash
med q wasm contract-state smart \
  me14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9sc0nehr \
  '{"get_version":{}}'
```

**3. Test new functionality works:**

```bash
# Test newly added feature
med tx wasm execute \
  me14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9sc0nehr \
  '{"new_feature":{}}' \
  --from me12s89yty5t0ed8vhx2l9xmcp6pwh2d8tfhtdwsk \
  --gas auto \
  --fees 10000umec \
  --home .mechain/
```

### 5.4 Common Scenarios and Best Practices

#### 5.4.1 Version Compatibility Check

```rust
#[entry_point]
pub fn migrate(
    deps: DepsMut,
    _env: Env,
    _msg: MigrateMsg,
) -> Result<Response, ContractError> {
    let ver = cw2::get_contract_version(deps.storage)?;
    
    // Ensure only upgradeable from specific version
    if ver.contract != env!("CARGO_PKG_NAME") {
        return Err(ContractError::InvalidContract {});
    }
    
    // Only allow upgrade from 0.1.x to 0.2.0
    if !ver.version.starts_with("0.1.") {
        return Err(ContractError::InvalidMigrationVersion {
            current: ver.version,
        });
    }
    
    // ... execute migration logic ...
    
    Ok(Response::default())
}
```

#### 5.4.2 Data Migration Strategies

**Strategy 1: One-time migration (suitable for small data volumes)**

```rust
pub fn migrate(deps: DepsMut, _env: Env, _msg: MigrateMsg) -> Result<Response, ContractError> {
    // Read all old data
    let old_items: Vec<_> = OLD_STORAGE
        .range(deps.storage, None, None, Order::Ascending)
        .collect::<StdResult<Vec<_>>>()?;
    
    // Convert and save to new storage
    for (key, old_value) in old_items {
        let new_value = convert_to_new_format(old_value)?;
        NEW_STORAGE.save(deps.storage, &key, &new_value)?;
    }
    
    Ok(Response::default())
}
```

**Strategy 2: Lazy migration (suitable for large data volumes)**

```rust
// Gradually migrate during queries or executions
pub fn execute_increment(deps: DepsMut) -> Result<Response, ContractError> {
    // Try loading new format
    let state = match STATE.may_load(deps.storage)? {
        Some(s) => s,
        None => {
            // If new format doesn't exist, load from old format and convert
            let old_state = OLD_STATE.load(deps.storage)?;
            let new_state = State::from(old_state);
            STATE.save(deps.storage, &new_state)?;
            new_state
        }
    };
    
    // ... continue execution logic ...
}
```

### 5.5 Complete Example

Here's a complete upgradeable contract example:

**error.rs (add migration-related errors):**

```rust
#[derive(Error, Debug)]
pub enum ContractError {
    // ... other errors ...
    
    #[error("Cannot migrate from different contract")]
    InvalidContract {},
    
    #[error("Cannot migrate from version {current}")]
    InvalidMigrationVersion { current: String },
}
```

**Complete migrate implementation:**

```rust
use cw2::{get_contract_version, set_contract_version};

#[entry_point]
pub fn migrate(
    deps: DepsMut,
    _env: Env,
    msg: MigrateMsg,
) -> Result<Response, ContractError> {
    // 1. Version check
    let ver = get_contract_version(deps.storage)?;
    if ver.contract != env!("CARGO_PKG_NAME") {
        return Err(ContractError::InvalidContract {});
    }
    
    // 2. Execute different migration logic based on old version
    let new_version = env!("CARGO_PKG_VERSION");
    
    match ver.version.as_str() {
        "0.1.0" | "0.1.1" => migrate_from_v0_1(deps.storage, msg)?,
        "0.2.0" => {
            // Migration logic from 0.2.0 to current version
        }
        _ => {
            return Err(ContractError::InvalidMigrationVersion {
                current: ver.version,
            })
        }
    }
    
    // 3. Update version info
    set_contract_version(deps.storage, env!("CARGO_PKG_NAME"), new_version)?;
    
    Ok(Response::new()
        .add_attribute("method", "migrate")
        .add_attribute("from_version", ver.version)
        .add_attribute("to_version", new_version))
}

fn migrate_from_v0_1(
    storage: &mut dyn Storage,
    msg: MigrateMsg,
) -> Result<(), ContractError> {
    // Specific migration logic
    // ...
    Ok(())
}
```

---

**Contract Upgrade Summary:**

Key points for contract upgrades:

1. **Implement migrate entry**: Must add `migrate` function in contract
2. **Compile new contract**: Use Docker optimizer to compile new version
3. **Upload and get code_id**: Deploy new code on-chain
4. **Execute migration command**: Use `med tx wasm migrate` to switch to new code
5. **Verify upgrade result**: Confirm code_id updated and functionality works

Through proper upgrade strategy, can smoothly fix bugs, add new features, or optimize performance without changing contract address.

> 🚨 **Security Considerations**
>
> **Must Do:**
>
> 1. **Fully test on testnet**: Verify upgrade process in test environment first
> 2. **Backup critical data**: Export important state data before upgrading
> 3. **Version checks**: Verify version compatibility in migrate
> 4. **Permission control**: Ensure only admin can execute upgrades
> 5. **Rollback plan**: Prepare downgrade approach (if needed)
>
> **Avoid:**
>
> 1. Don't execute complex business logic in migrate
> 2. Don't directly upgrade mainnet contracts without testing
> 3. Don't forget to update documentation and version numbers

---

## Summary

Meta Earth's smart contract platform provides:

- 🦀 **Rust-based development**: Type safety and high performance
- 🐳 **Docker optimization**: Deterministic builds and optimal size
- 🔄 **Upgradeable contracts**: Smooth upgrades without address changes
- 🔐 **Secure by default**: Built-in security best practices
- 📊 **Rich tooling**: Complete development and deployment toolkit

---

**Document Version**: v2.0.0  
**Last Updated**: 2026-01-09  
**Maintainer**: Meta Earth Development Team

For questions, contact: support@mechain.io

