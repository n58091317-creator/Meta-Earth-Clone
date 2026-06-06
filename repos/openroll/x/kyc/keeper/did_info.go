package keeper

import (
	"github.com/cosmos/cosmos-sdk/store/prefix"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/st-chain/rollapp/x/kyc/types"
)

// SetDidInfo set a specific didInfo in the store from its index
func (k Keeper) SetDidInfo(ctx sdk.Context, didInfo types.DidInfo) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.DidInfoKeyPrefix))
	b := k.cdc.MustMarshal(&didInfo)
	store.Set(types.DidInfoKey(
		didInfo.Did,
	), b)
}

// GetDidInfo returns a didInfo from its index
func (k Keeper) GetDidInfo(
	ctx sdk.Context,
	did string,

) (val types.DidInfo, found bool) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.DidInfoKeyPrefix))

	b := store.Get(types.DidInfoKey(
		did,
	))
	if b == nil {
		return val, false
	}

	k.cdc.MustUnmarshal(b, &val)
	return val, true
}

// RemoveDidInfo removes a didInfo from the store
func (k Keeper) RemoveDidInfo(
	ctx sdk.Context,
	did string,

) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.DidInfoKeyPrefix))
	store.Delete(types.DidInfoKey(
		did,
	))
}

// GetAllDidInfo returns all didInfo
func (k Keeper) GetAllDidInfo(ctx sdk.Context) (list []types.DidInfo) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.DidInfoKeyPrefix))
	iterator := sdk.KVStorePrefixIterator(store, []byte{})

	defer iterator.Close()

	for ; iterator.Valid(); iterator.Next() {
		var val types.DidInfo
		k.cdc.MustUnmarshal(iterator.Value(), &val)
		list = append(list, val)
	}

	return
}
