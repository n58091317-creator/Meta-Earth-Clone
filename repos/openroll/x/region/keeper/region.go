package keeper

import (
	"github.com/cosmos/cosmos-sdk/store/prefix"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/st-chain/rollapp/x/region/types"
)

// SetRegion set a specific region in the store from its index
func (k Keeper) SetRegion(ctx sdk.Context, region types.Region) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.RegionKeyPrefix))
	b := k.cdc.MustMarshal(&region)
	store.Set(types.RegionKey(
		region.RegionId,
	), b)
}

// GetRegion returns a region from its index
func (k Keeper) GetRegion(
	ctx sdk.Context,
	regionId string,

) (val types.Region, found bool) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.RegionKeyPrefix))

	b := store.Get(types.RegionKey(
		regionId,
	))
	if b == nil {
		return val, false
	}

	k.cdc.MustUnmarshal(b, &val)
	return val, true
}
func (k Keeper) GetRegionI(
	ctx sdk.Context,
	regionId string,

) (val types.RegionI, found bool) {
	r, found := k.GetRegion(
		ctx,
		regionId,
	)
	return &r, found
}

// RemoveRegion removes a region from the store
func (k Keeper) RemoveRegion(
	ctx sdk.Context,
	regionId string,

) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.RegionKeyPrefix))
	store.Delete(types.RegionKey(
		regionId,
	))
}

// GetAllRegion returns all region
func (k Keeper) GetAllRegion(ctx sdk.Context) (list []types.Region) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.RegionKeyPrefix))
	iterator := sdk.KVStorePrefixIterator(store, []byte{})

	defer iterator.Close()

	for ; iterator.Valid(); iterator.Next() {
		var val types.Region
		k.cdc.MustUnmarshal(iterator.Value(), &val)
		list = append(list, val)
	}

	return
}
