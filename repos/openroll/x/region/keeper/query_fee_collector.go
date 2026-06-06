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

func (k Keeper) FeeCollectorAll(goCtx context.Context, req *types.QueryAllFeeCollectorRequest) (*types.QueryAllFeeCollectorResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	var feeCollectors []types.FeeCollector
	ctx := sdk.UnwrapSDKContext(goCtx)

	store := ctx.KVStore(k.storeKey)
	feeCollectorStore := prefix.NewStore(store, types.KeyPrefix(types.FeeCollectorKeyPrefix))

	pageRes, err := query.Paginate(feeCollectorStore, req.Pagination, func(key []byte, value []byte) error {
		var feeCollector types.FeeCollector
		if err := k.cdc.Unmarshal(value, &feeCollector); err != nil {
			return err
		}

		feeCollectors = append(feeCollectors, feeCollector)
		return nil
	})

	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &types.QueryAllFeeCollectorResponse{FeeCollector: feeCollectors, Pagination: pageRes}, nil
}

func (k Keeper) FeeCollector(goCtx context.Context, req *types.QueryGetFeeCollectorRequest) (*types.QueryGetFeeCollectorResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}
	ctx := sdk.UnwrapSDKContext(goCtx)

	val, found := k.GetFeeCollector(
		ctx,
		req.Index,
	)
	if !found {
		return nil, status.Error(codes.NotFound, "not found")
	}

	return &types.QueryGetFeeCollectorResponse{FeeCollector: val}, nil
}
