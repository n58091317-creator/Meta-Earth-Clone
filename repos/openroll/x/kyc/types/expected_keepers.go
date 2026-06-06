package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/x/auth/types"
	"github.com/cosmos/ibc-go/v6/modules/core/exported"

	ics23 "github.com/confio/ics23/go"

	commitmenttypes "github.com/cosmos/ibc-go/v6/modules/core/23-commitment/types"
)

// AccountKeeper defines the expected account keeper used for simulations (noalias)
type AccountKeeper interface {
	GetAccount(ctx sdk.Context, addr sdk.AccAddress) types.AccountI
	SetAccount(ctx sdk.Context, acc types.AccountI)
	HasAccount(ctx sdk.Context, addr sdk.AccAddress) bool
	NewAccountWithAddress(ctx sdk.Context, addr sdk.AccAddress) types.AccountI
	// Methods imported from account should be defined here
}

// BankKeeper defines the expected interface needed to retrieve account balances.
type BankKeeper interface {
	SpendableCoins(ctx sdk.Context, addr sdk.AccAddress) sdk.Coins
	SendCoinsFromModuleToAccount(ctx sdk.Context, senderModule string, recipientAddr sdk.AccAddress, amt sdk.Coins) error
	// Methods imported from bank should be defined here
}
type ClientKeeper interface {
	GetClientConsensusState(ctx sdk.Context, clientID string, height exported.Height) (exported.ConsensusState, bool)
	GetClientState(ctx sdk.Context, clientID string) (exported.ClientState, bool)
	GetLatestClientConsensusState(ctx sdk.Context, clientID string) (exported.ConsensusState, bool)
}

type HubAuthKeeper interface {
	VerifyMembership(ctx sdk.Context, ProofHeight uint64, path commitmenttypes.MerklePath, proof []byte, value []byte) error
	BatchVerifyMembership(ctx sdk.Context, ProofHeight uint64, storeKey []byte, storeValue []byte, storeProof *ics23.CommitmentProof, items map[string][]byte, proofs *ics23.CommitmentProof) error
	BatchVerifyNonMembership(ctx sdk.Context, ProofHeight uint64, storeKey []byte, storeValue []byte, storeProof *ics23.CommitmentProof, items [][]byte, proofs *ics23.CommitmentProof) error
}
