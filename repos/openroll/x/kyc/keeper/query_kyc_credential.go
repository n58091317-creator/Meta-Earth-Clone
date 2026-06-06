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

func (k Keeper) KYCCredentialAll(goCtx context.Context, req *types.QueryAllKYCCredentialRequest) (*types.QueryAllKYCCredentialResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	var kYCCredentials []types.KYCCredential
	ctx := sdk.UnwrapSDKContext(goCtx)

	store := ctx.KVStore(k.storeKey)
	kYCCredentialStore := prefix.NewStore(store, types.KeyPrefix(types.KYCCredentialKeyPrefix))

	pageRes, err := query.Paginate(kYCCredentialStore, req.Pagination, func(key []byte, value []byte) error {
		var kYCCredential types.KYCCredential
		if err := k.cdc.Unmarshal(value, &kYCCredential); err != nil {
			return err
		}

		kYCCredentials = append(kYCCredentials, kYCCredential)
		return nil
	})

	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &types.QueryAllKYCCredentialResponse{KYCCredential: kYCCredentials, Pagination: pageRes}, nil
}

func (k Keeper) KYCCredential(goCtx context.Context, req *types.QueryGetKYCCredentialRequest) (*types.QueryGetKYCCredentialResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}
	ctx := sdk.UnwrapSDKContext(goCtx)

	val, found := k.GetKYCCredential(
		ctx,
		req.Did,
	)
	if !found {
		return nil, status.Error(codes.NotFound, "not found")
	}

	return &types.QueryGetKYCCredentialResponse{KYCCredential: val}, nil
}
