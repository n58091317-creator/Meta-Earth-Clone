package keeper

import (
	"github.com/cosmos/cosmos-sdk/store/prefix"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/st-chain/rollapp/x/region/types"
)

// SetDevOperator set devOperator in the store
func (k Keeper) SetDevOperator(ctx sdk.Context, devOperator types.DevOperator) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.DevOperatorKey))
	b := k.cdc.MustMarshal(&devOperator)
	store.Set([]byte{0}, b)
}

// GetDevOperator returns devOperator
func (k Keeper) GetDevOperator(ctx sdk.Context) (val types.DevOperator, found bool) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.DevOperatorKey))

	b := store.Get([]byte{0})
	if b == nil {
		return val, false
	}

	k.cdc.MustUnmarshal(b, &val)
	return val, true
}

// RemoveDevOperator removes devOperator from the store
func (k Keeper) RemoveDevOperator(ctx sdk.Context) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.DevOperatorKey))
	store.Delete([]byte{0})
}
