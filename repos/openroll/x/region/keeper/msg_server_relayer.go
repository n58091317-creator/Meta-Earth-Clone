package keeper

import (
	"context"

	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	"github.com/st-chain/rollapp/x/region/types"
)

func (k msgServer) CreateRelayer(goCtx context.Context, msg *types.MsgCreateRelayer) (*types.MsgCreateRelayerResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Check if the value already exists
	_, isFound := k.GetRelayer(
		ctx,
		msg.Address,
	)
	if isFound {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "index already set")
	}
	// creation allowed by message creator; DAO removed

	var relayer = types.Relayer{
		Creator: msg.Creator,
		Address: msg.Address,
	}

	k.SetRelayer(
		ctx,
		relayer,
	)
	return &types.MsgCreateRelayerResponse{}, nil
}

func (k msgServer) UpdateRelayer(goCtx context.Context, msg *types.MsgUpdateRelayer) (*types.MsgUpdateRelayerResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Check if the value exists
	_, isFound := k.GetRelayer(
		ctx,
		msg.Creator,
	)
	if !isFound {
		return nil, sdkerrors.Wrap(sdkerrors.ErrKeyNotFound, "index not set")
	}

	k.RemoveRelayer(ctx, msg.Creator)
	var relayer = types.Relayer{
		Creator: msg.Creator,
		Address: msg.Address,
	}

	k.SetRelayer(ctx, relayer)

	return &types.MsgUpdateRelayerResponse{}, nil
}

func (k msgServer) DeleteRelayer(goCtx context.Context, msg *types.MsgDeleteRelayer) (*types.MsgDeleteRelayerResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Check if the value exists
	valFound, isFound := k.GetRelayer(
		ctx,
		msg.Address,
	)
	if !isFound {
		return nil, sdkerrors.Wrap(sdkerrors.ErrKeyNotFound, "index not set")
	}

	// Checks if the the msg creator is the same as the current owner
	if msg.Creator != valFound.Creator {
		return nil, sdkerrors.Wrap(sdkerrors.ErrUnauthorized, "incorrect owner")
	}

	k.RemoveRelayer(
		ctx,
		msg.Address,
	)

	return &types.MsgDeleteRelayerResponse{}, nil
}
