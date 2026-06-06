package types

import "encoding/binary"

var _ binary.ByteOrder

const (
	// KYCCredentialKeyPrefix is the prefix to retrieve all KYCCredential
	KYCCredentialKeyPrefix = "KYCCredential/value/"
)

// KYCCredentialKey returns the store key to retrieve a KYCCredential from the index fields
func KYCCredentialKey(
	did string,
) []byte {
	var key []byte

	didBytes := []byte(did)
	key = append(key, didBytes...)
	key = append(key, []byte("/")...)

	return key
}
