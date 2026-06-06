package layer1

import (
	"fmt"
	"github.com/stretchr/testify/require"
	"testing"
)

func TestCheckAccountSequence(t *testing.T) {
	errMsg := "rpc error: code = Unknown desc = rpc error: code = Unknown desc = account sequence mismatch, expected 16186, got 16185: incorrect account sequence [cosmos/cosmos-sdk@v0.46.16/x/auth/ante/sigverify.go:269] With gas wanted: '18446744073709551615' and gas used: '437040' : unknown request"
	isSequence, expectedSeq, err := CheckAccountSequence(errMsg)

	require.NoError(t, err)

	fmt.Println(isSequence)
	fmt.Println(expectedSeq)
}
