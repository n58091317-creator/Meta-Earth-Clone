package types

import "encoding/binary"

var _ binary.ByteOrder

const (
	// DidInfoKeyPrefix is the prefix to retrieve all DidInfo
	DidInfoKeyPrefix = "DidInfo/value/"
)

// DidInfoKey returns the store key to retrieve a DidInfo from the index fields
func DidInfoKey(
	did string,
) []byte {
	var key []byte

	didBytes := []byte(did)
	key = append(key, didBytes...)
	key = append(key, []byte("/")...)

	return key
}
