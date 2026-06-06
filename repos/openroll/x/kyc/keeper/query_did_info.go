package keeper

import (
	"context"

	"github.com/cosmos/cosmos-sdk/store/prefix"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/query"
	"github.com/st-chain/rollapp/x/kyc/types"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (k Keeper) DidInfoAll(goCtx context.Context, req *types.QueryAllDidInfoRequest) (*types.QueryAllDidInfoResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	var didInfos []types.DidInfo
	ctx := sdk.UnwrapSDKContext(goCtx)

	store := ctx.KVStore(k.storeKey)
	didInfoStore := prefix.NewStore(store, types.KeyPrefix(types.DidInfoKeyPrefix))

	pageRes, err := query.Paginate(didInfoStore, req.Pagination, func(key []byte, value []byte) error {
		var didInfo types.DidInfo
		if err := k.cdc.Unmarshal(value, &didInfo); err != nil {
			return err
		}

		didInfos = append(didInfos, didInfo)
		return nil
	})

	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &types.QueryAllDidInfoResponse{DidInfo: didInfos, Pagination: pageRes}, nil
}

func (k Keeper) DidInfo(goCtx context.Context, req *types.QueryGetDidInfoRequest) (*types.QueryGetDidInfoResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}
	ctx := sdk.UnwrapSDKContext(goCtx)

	val, found := k.GetDidInfo(
		ctx,
		req.Did,
	)
	if !found {
		return nil, status.Error(codes.NotFound, "not found")
	}

	return &types.QueryGetDidInfoResponse{DidInfo: val}, nil
}
