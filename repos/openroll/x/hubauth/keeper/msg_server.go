package keeper

import (
	"context"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/st-chain/rollapp/x/hubauth/types"
)

type msgServer struct {
	Keeper
}

// NewMsgServerImpl returns an implementation of the MsgServer interface
// for the provided Keeper.
func NewMsgServerImpl(keeper Keeper) types.MsgServer {
	return &msgServer{Keeper: keeper}
}

var _ types.MsgServer = msgServer{}

func (k msgServer) SetClientId(goCtx context.Context, msg *types.MsgSetClientId) (*types.MsgSetClientIdResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)
	// DAO removed: no IsDao check performed here
	params := types.Params{
		ClientId:  msg.ClientId,
		DenomPath: msg.DenomPath,
	}
	k.SetParams(ctx, params)
	return &types.MsgSetClientIdResponse{}, nil
}
