package keeper

import (
	"context"

	"github.com/cosmos/cosmos-sdk/store/prefix"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/query"
	"github.com/st-chain/rollapp/x/region/types"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (k Keeper) RelayerAll(goCtx context.Context, req *types.QueryAllRelayerRequest) (*types.QueryAllRelayerResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	var relayers []types.Relayer
	ctx := sdk.UnwrapSDKContext(goCtx)

	store := ctx.KVStore(k.storeKey)
	relayerStore := prefix.NewStore(store, types.KeyPrefix(types.RelayerKeyPrefix))

	pageRes, err := query.Paginate(relayerStore, req.Pagination, func(key []byte, value []byte) error {
		var relayer types.Relayer
		if err := k.cdc.Unmarshal(value, &relayer); err != nil {
			return err
		}

		relayers = append(relayers, relayer)
		return nil
	})

	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &types.QueryAllRelayerResponse{Relayer: relayers, Pagination: pageRes}, nil
}

func (k Keeper) Relayer(goCtx context.Context, req *types.QueryGetRelayerRequest) (*types.QueryGetRelayerResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}
	ctx := sdk.UnwrapSDKContext(goCtx)

	val, found := k.GetRelayer(
		ctx,
		req.Address,
	)
	if !found {
		return nil, status.Error(codes.NotFound, "not found")
	}

	return &types.QueryGetRelayerResponse{Relayer: val}, nil
}
