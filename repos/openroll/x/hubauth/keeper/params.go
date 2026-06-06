package keeper

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/st-chain/rollapp/x/hubauth/types"
)

// GetParams get all parameters as types.Params
func (k Keeper) GetParams(ctx sdk.Context) types.Params {
	params := types.Params{}
	k.paramstore.GetParamSet(ctx, &params)
	return params
}

// SetParams set the params
func (k Keeper) SetParams(ctx sdk.Context, params types.Params) {
	k.paramstore.SetParamSet(ctx, &params)
}

// ClientId returns the ClientId param
func (k Keeper) ClientId(ctx sdk.Context) (res string) {
	k.paramstore.Get(ctx, types.KeyClientId, &res)
	return
}

func (k Keeper) DenomPath(ctx sdk.Context) (res string) {
	k.paramstore.Get(ctx, types.KeyDenomPath, &res)
	return
}
