package types

const (
	// ModuleName defines the module name
	ModuleName = "kyc"

	// StoreKey defines the primary module store key
	StoreKey = ModuleName

	// RouterKey defines the module's message routing key
	RouterKey = ModuleName

	// MemStoreKey defines the in-memory store key
	MemStoreKey = "mem_kyc"

	// Version defines the current version the IBC module supports
	Version = "kyc-1"

	// PortID is the default port id that module binds to
	PortID = "kyc"
)

var (
	// PortKey defines the key to store the port ID in store
	PortKey = KeyPrefix("kyc-port-")
)

func KeyPrefix(p string) []byte {
	return []byte(p)
}

// keys on me-hub
const MeHubDidStoreKey = "did"

var MeHubDIDPrefix = []byte{0x10}
var MeHUbCredentialPrefix = []byte{0x40}

var MeHubDIDInfoPrefix = []byte{0x11}

func GetCredentialPrefixByDid(did string) []byte {
	return append(MeHUbCredentialPrefix, []byte(did)...)
}

func GetCredentialKey(did string) []byte {
	return append(GetCredentialPrefixByDid(did), "kyc"...)
}
