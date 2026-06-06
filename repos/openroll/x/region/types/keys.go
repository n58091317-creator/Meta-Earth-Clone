package types

const (
	// ModuleName defines the module name
	ModuleName = "region"

	// StoreKey defines the primary module store key
	StoreKey = ModuleName

	// RouterKey defines the module's message routing key
	RouterKey = ModuleName

	// MemStoreKey defines the in-memory store key
	MemStoreKey = "mem_region"

	// Version defines the current version the IBC module supports
	Version = "region-1"

	// PortID is the default port id that module binds to
	PortID = "region"
)

var (
	// PortKey defines the key to store the port ID in store
	PortKey = KeyPrefix("region-port-")
)

func KeyPrefix(p string) []byte {
	return []byte(p)
}

// Store key prefixes and helpers
const (
	DevOperatorKey        = "DevOperator"
	RelayerKeyPrefix      = "Relayer/value/"
	RegionKeyPrefix       = "Region/value/"
	FeeCollectorKeyPrefix = "FeeCollector/value/"
)

func RelayerKey(address string) []byte {
	return []byte(address)
}

func RegionKey(regionId string) []byte {
	return []byte(regionId)
}

func FeeCollectorKey(index string) []byte {
	return []byte(index)
}

// me-hub related store key and prefix used in merkle proofs
const MeHubRegionStoreKey = "mehub-region"

var MeHubRegionPrefix = []byte{0x10}

// global pool name for gas fee aggregation
const GlobalGasFeePool = "global_gas_fee_pool"
