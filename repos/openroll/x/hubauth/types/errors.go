package types

// DONTCOVER

import (
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

// x/hubauth module sentinel errors

var (
	ErrClientStateNotFound    = sdkerrors.Register(ModuleName, 2003, "client state not found")
	ErrConsensusStateNotFound = sdkerrors.Register(ModuleName, 2004, "consensus state not found")
	ErrInvalidProofHeight     = sdkerrors.Register(ModuleName, 2005, "invalid proof height")
	ErrVerifyMembershipFailed = sdkerrors.Register(ModuleName, 2006, "verify membership failed")
	ErrInvalidClientState     = sdkerrors.Register(ModuleName, 2007, "invalid client state")
	ErrInvalidMerkleProof     = sdkerrors.Register(ModuleName, 2008, "invalid merkle proof")

	ErrVerifyStoreProofFailed  = sdkerrors.Register(ModuleName, 2009, "verify store proof failed")
	ErrVerifyMemberProofFailed = sdkerrors.Register(ModuleName, 2010, "verify member proof failed")
)
