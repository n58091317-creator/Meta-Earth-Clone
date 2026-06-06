package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/ibc-go/v6/modules/core/exported"
	tmbytes "github.com/tendermint/tendermint/libs/bytes"

	"github.com/cosmos/ibc-go/v6/modules/apps/transfer/types"
)

type ClientKeeper interface {
	GetClientConsensusState(ctx sdk.Context, clientID string, height exported.Height) (exported.ConsensusState, bool)
	GetClientState(ctx sdk.Context, clientID string) (exported.ClientState, bool)
	GetLatestClientConsensusState(ctx sdk.Context, clientID string) (exported.ConsensusState, bool)
}

type ChannelKeeper interface {
	GetChannelConnection(ctx sdk.Context, portID, channelID string) (string, exported.ConnectionI, error)
}
type IbcTransferKeeper interface {
	GetDenomTrace(ctx sdk.Context, denomTraceHash tmbytes.HexBytes) (types.DenomTrace, bool)
}

type RegionKeeper interface {
}
