package types

import (
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

var (
	ErrInvalidMerkleProof = sdkerrors.Register(ModuleName, 1100, "invalid merkle proof")
	ErrInvalidItem        = sdkerrors.Register(ModuleName, 1101, "invalid item")
)
