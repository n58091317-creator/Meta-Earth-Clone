package region

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/st-chain/rollapp/x/region/keeper"
	"github.com/st-chain/rollapp/x/region/types"
)

// InitGenesis initializes the module's state from a provided genesis state.
func InitGenesis(ctx sdk.Context, k keeper.Keeper, genState types.GenesisState) {
	// Set all the region
	for _, elem := range genState.RegionList {
		k.SetRegion(ctx, elem)
	}
	// Set if defined
	// Set all the relayer
	for _, elem := range genState.RelayerList {
		k.SetRelayer(ctx, elem)
	}
	// Set all the feeCollector
	for _, elem := range genState.FeeCollectorList {
		k.SetFeeCollector(ctx, elem)
	}
	// Set if defined
	if genState.DevOperator != nil {
		k.SetDevOperator(ctx, *genState.DevOperator)
	}
	// this line is used by starport scaffolding # genesis/module/init
	k.SetParams(ctx, genState.Params)
}

// ExportGenesis returns the module's exported genesis
func ExportGenesis(ctx sdk.Context, k keeper.Keeper) *types.GenesisState {
	genesis := types.DefaultGenesis()
	genesis.Params = k.GetParams(ctx)

	genesis.RegionList = k.GetAllRegion(ctx)

	genesis.RelayerList = k.GetAllRelayer(ctx)
	genesis.FeeCollectorList = k.GetAllFeeCollector(ctx)
	// Get all devOperator
	devOperator, found := k.GetDevOperator(ctx)
	if found {
		genesis.DevOperator = &devOperator
	}
	// this line is used by starport scaffolding # genesis/module/export

	return genesis
}
