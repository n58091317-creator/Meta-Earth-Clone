package keeper

import (
	"github.com/cosmos/cosmos-sdk/store/prefix"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/st-chain/rollapp/x/region/types"
)

// SetRelayer set a specific relayer in the store from its index
func (k Keeper) SetRelayer(ctx sdk.Context, relayer types.Relayer) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.RelayerKeyPrefix))
	b := k.cdc.MustMarshal(&relayer)
	store.Set(types.RelayerKey(
		relayer.Address,
	), b)
	k.SetAccount(ctx, relayer.Address)
}

func (k Keeper) SetAccount(sdkCtx sdk.Context, address string) {
	accAddr := sdk.MustAccAddressFromBech32(address)
	if !k.accountKeeper.HasAccount(sdkCtx, accAddr) {
		acc := k.accountKeeper.NewAccountWithAddress(sdkCtx, accAddr)
		k.accountKeeper.SetAccount(sdkCtx, acc)
	}
}

// GetRelayer returns a relayer from its index
func (k Keeper) GetRelayer(
	ctx sdk.Context,
	address string,

) (val types.Relayer, found bool) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.RelayerKeyPrefix))

	b := store.Get(types.RelayerKey(
		address,
	))
	if b == nil {
		return val, false
	}

	k.cdc.MustUnmarshal(b, &val)
	return val, true
}

// RemoveRelayer removes a relayer from the store
func (k Keeper) RemoveRelayer(
	ctx sdk.Context,
	address string,

) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.RelayerKeyPrefix))
	store.Delete(types.RelayerKey(
		address,
	))
}

// GetAllRelayer returns all relayer
func (k Keeper) GetAllRelayer(ctx sdk.Context) (list []types.Relayer) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.RelayerKeyPrefix))
	iterator := sdk.KVStorePrefixIterator(store, []byte{})

	defer iterator.Close()

	for ; iterator.Valid(); iterator.Next() {
		var val types.Relayer
		k.cdc.MustUnmarshal(iterator.Value(), &val)
		list = append(list, val)
	}

	return
}
