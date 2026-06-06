package keeper

import (
	"fmt"

	"github.com/cosmos/cosmos-sdk/codec"
	storetypes "github.com/cosmos/cosmos-sdk/store/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"
	"github.com/tendermint/tendermint/libs/log"

	"github.com/st-chain/rollapp/x/region/types"
)

type (
	Keeper struct {
		cdc                 codec.BinaryCodec
		storeKey            storetypes.StoreKey
		memKey              storetypes.StoreKey
		paramstore          paramtypes.Subspace
		hubAuthKeeper       types.HubAuthKeeper
		accountKeeper       types.AccountKeeper
		bankKeeper          types.BankKeeper
		IbcTransfer         types.IbcTransferKeeper
		HubFeeCollectorName string
	}
)

func NewKeeper(
	cdc codec.BinaryCodec,
	storeKey,
	memKey storetypes.StoreKey,
	ps paramtypes.Subspace,
	HubAuthKeeper types.HubAuthKeeper,
	accountKeeper types.AccountKeeper,
	bankKeeper types.BankKeeper,
	IbcTransfer types.IbcTransferKeeper,
	HubFeeCollectorName string,

) *Keeper {
	// set KeyTable if it has not already been set
	if !ps.HasKeyTable() {
		ps = ps.WithKeyTable(types.ParamKeyTable())
	}

	return &Keeper{
		cdc:                 cdc,
		storeKey:            storeKey,
		memKey:              memKey,
		paramstore:          ps,
		hubAuthKeeper:       HubAuthKeeper,
		accountKeeper:       accountKeeper,
		bankKeeper:          bankKeeper,
		IbcTransfer:         IbcTransfer,
		HubFeeCollectorName: HubFeeCollectorName,
	}
}

func (k Keeper) Logger(ctx sdk.Context) log.Logger {
	return ctx.Logger().With("module", fmt.Sprintf("x/%s", types.ModuleName))
}
