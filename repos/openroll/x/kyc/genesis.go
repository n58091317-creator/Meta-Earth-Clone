package kyc

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/st-chain/rollapp/x/kyc/keeper"
	"github.com/st-chain/rollapp/x/kyc/types"
)

// InitGenesis initializes the module's state from a provided genesis state.
func InitGenesis(ctx sdk.Context, k keeper.Keeper, genState types.GenesisState) {
	// Set all the kYCCredential
	for _, elem := range genState.KYCCredentialList {
		k.SetKYCCredential(ctx, elem)
	}
	// Set all the did
	for _, elem := range genState.DidList {
		k.SetDid(ctx, elem)
	}
	// Set all the didInfo
	for _, elem := range genState.DidInfoList {
		k.SetDidInfo(ctx, elem)
	}
	// this line is used by starport scaffolding # genesis/module/init
	k.SetParams(ctx, genState.Params)
}

// ExportGenesis returns the module's exported genesis
func ExportGenesis(ctx sdk.Context, k keeper.Keeper) *types.GenesisState {
	genesis := types.DefaultGenesis()
	genesis.Params = k.GetParams(ctx)

	genesis.KYCCredentialList = k.GetAllKYCCredential(ctx)
	genesis.DidList = k.GetAllDid(ctx)
	genesis.DidInfoList = k.GetAllDidInfo(ctx)
	// this line is used by starport scaffolding # genesis/module/export

	return genesis
}
