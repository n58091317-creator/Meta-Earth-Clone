package keeper

import (
	"github.com/cosmos/cosmos-sdk/store/prefix"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/st-chain/rollapp/x/region/types"
)

// SetFeeCollector set a specific feeCollector in the store from its index
func (k Keeper) SetFeeCollector(ctx sdk.Context, feeCollector types.FeeCollector) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.FeeCollectorKeyPrefix))
	b := k.cdc.MustMarshal(&feeCollector)
	store.Set(types.FeeCollectorKey(
		feeCollector.Index,
	), b)
}

// GetFeeCollector returns a feeCollector from its index
func (k Keeper) GetFeeCollector(
	ctx sdk.Context,
	regionId string,

) (val types.FeeCollector, found bool) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.FeeCollectorKeyPrefix))

	b := store.Get(types.FeeCollectorKey(
		regionId,
	))
	if b == nil {
		return val, false
	}

	k.cdc.MustUnmarshal(b, &val)
	return val, true
}

// RemoveFeeCollector removes a feeCollector from the store
func (k Keeper) RemoveFeeCollector(
	ctx sdk.Context,
	regionId string,

) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.FeeCollectorKeyPrefix))
	store.Delete(types.FeeCollectorKey(
		regionId,
	))
}

// GetAllFeeCollector returns all feeCollector
func (k Keeper) GetAllFeeCollector(ctx sdk.Context) (list []types.FeeCollector) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.FeeCollectorKeyPrefix))
	iterator := sdk.KVStorePrefixIterator(store, []byte{})

	defer iterator.Close()

	for ; iterator.Valid(); iterator.Next() {
		var val types.FeeCollector
		k.cdc.MustUnmarshal(iterator.Value(), &val)
		list = append(list, val)
	}

	return
}

// RemoveAllFeeCollector removes all feeCollector from the store
func (k Keeper) RemoveAllFeeCollector(ctx sdk.Context) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.FeeCollectorKeyPrefix))
	iterator := sdk.KVStorePrefixIterator(store, []byte{})
	defer iterator.Close()
	for ; iterator.Valid(); iterator.Next() {
		store.Delete(iterator.Key())
	}
}
