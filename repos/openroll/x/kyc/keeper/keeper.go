package keeper

import (
	"fmt"

	"github.com/cosmos/cosmos-sdk/codec"
	storetypes "github.com/cosmos/cosmos-sdk/store/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"
	"github.com/tendermint/tendermint/libs/log"

	"github.com/st-chain/rollapp/x/kyc/types"
)

type (
	Keeper struct {
		cdc           codec.BinaryCodec
		storeKey      storetypes.StoreKey
		memKey        storetypes.StoreKey
		paramstore    paramtypes.Subspace
		hubAuthKeeper types.HubAuthKeeper
		accountKeeper types.AccountKeeper
	}
)

func NewKeeper(
	cdc codec.BinaryCodec,
	storeKey,
	memKey storetypes.StoreKey,
	ps paramtypes.Subspace,
	hubauth types.HubAuthKeeper,
	accountKeeper types.AccountKeeper,
) *Keeper {
	// set KeyTable if it has not already been set
	if !ps.HasKeyTable() {
		ps = ps.WithKeyTable(types.ParamKeyTable())
	}

	return &Keeper{
		cdc:           cdc,
		storeKey:      storeKey,
		memKey:        memKey,
		paramstore:    ps,
		hubAuthKeeper: hubauth,
		accountKeeper: accountKeeper,
	}
}

func (k Keeper) Logger(ctx sdk.Context) log.Logger {
	return ctx.Logger().With("module", fmt.Sprintf("x/%s", types.ModuleName))
}

// func (k Keeper) IsKycUser(ctx sdk.Context, address string) bool {
// 	did, found := k.GetDid(ctx, address)
// 	if !found {
// 		return false
// 	}
// 	_, found = k.GetKYCCredential(ctx, did.Did)
// 	return found
// }

func (k Keeper) GetAddressKYC(ctx sdk.Context, address string) (types.KYCCredential, bool) {
	did, found := k.GetDid(ctx, address)
	if !found {
		return types.KYCCredential{}, false
	}
	return k.GetKYCCredential(ctx, did.Did)
}

func (k Keeper) GetKycLevel(ctx sdk.Context, address string) (level types.KycLevel, region string, isKyc bool) {
	did, found := k.GetDid(ctx, address)
	if !found {
		return 0, "", false
	}
	info, found := k.GetDidInfo(ctx, did.Did)
	if !found {
		return 0, "", false
	}
	return info.KycLevel, info.RegionId, true
}
