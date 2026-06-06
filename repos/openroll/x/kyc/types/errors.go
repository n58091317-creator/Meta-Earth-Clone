package types

// DONTCOVER

import (
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

// x/kyc module sentinel errors
var (
	ErrInvalidUpdateInfo       = sdkerrors.Register(ModuleName, 1502, "invalid update info")
	ErrClientStateNotFound     = sdkerrors.Register(ModuleName, 1503, "client state not found")
	ErrConsensusStateNotFound  = sdkerrors.Register(ModuleName, 1504, "consensus state not found")
	ErrInvalidProofHeight      = sdkerrors.Register(ModuleName, 1505, "invalid proof height")
	ErrVerifyMembershipFailed  = sdkerrors.Register(ModuleName, 1506, "verify membership failed")
	ErrInvalidClientState      = sdkerrors.Register(ModuleName, 1507, "invalid client state")
	ErrInvalidMerkleProof      = sdkerrors.Register(ModuleName, 1508, "invalid merkle proof")
	ErrVerifyProofFailed       = sdkerrors.Register(ModuleName, 1509, "verify proof failed")
	ErrVerifyStoreProofFailed  = sdkerrors.Register(ModuleName, 1510, "verify store proof failed")
	ErrVerifyMemberProofFailed = sdkerrors.Register(ModuleName, 1511, "verify member proof failed")
	ErrInvalidItem             = sdkerrors.Register(ModuleName, 1512, "prefix or suffix not format")
)
