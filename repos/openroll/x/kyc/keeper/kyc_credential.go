package keeper

import (
	"github.com/cosmos/cosmos-sdk/store/prefix"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/st-chain/rollapp/x/kyc/types"
)

// SetKYCCredential set a specific kYCCredential in the store from its index
func (k Keeper) SetKYCCredential(ctx sdk.Context, kYCCredential types.KYCCredential) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.KYCCredentialKeyPrefix))
	b := k.cdc.MustMarshal(&kYCCredential)
	store.Set(types.KYCCredentialKey(
		kYCCredential.Did,
	), b)
}

// GetKYCCredential returns a kYCCredential from its index
func (k Keeper) GetKYCCredential(
	ctx sdk.Context,
	did string,

) (val types.KYCCredential, found bool) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.KYCCredentialKeyPrefix))

	b := store.Get(types.KYCCredentialKey(
		did,
	))
	if b == nil {
		return val, false
	}

	k.cdc.MustUnmarshal(b, &val)
	return val, true
}

// RemoveKYCCredential removes a kYCCredential from the store
func (k Keeper) RemoveKYCCredential(
	ctx sdk.Context,
	did string,

) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.KYCCredentialKeyPrefix))
	store.Delete(types.KYCCredentialKey(
		did,
	))
}

// GetAllKYCCredential returns all kYCCredential
func (k Keeper) GetAllKYCCredential(ctx sdk.Context) (list []types.KYCCredential) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.KYCCredentialKeyPrefix))
	iterator := sdk.KVStorePrefixIterator(store, []byte{})

	defer iterator.Close()

	for ; iterator.Valid(); iterator.Next() {
		var val types.KYCCredential
		k.cdc.MustUnmarshal(iterator.Value(), &val)
		list = append(list, val)
	}

	return
}
