package region_test

import (
	"testing"

	keepertest "github.com/st-chain/rollapp/testutil/keeper"
	"github.com/st-chain/rollapp/testutil/nullify"
	"github.com/st-chain/rollapp/x/region"
	"github.com/st-chain/rollapp/x/region/types"
	"github.com/stretchr/testify/require"
)

func TestGenesis(t *testing.T) {
	genesisState := types.GenesisState{
		Params: types.DefaultParams(),

		RegionList: []types.Region{
			{
				RegionId: "0",
			},
			{
				RegionId: "1",
			},
		},
		RelayerList: []types.Relayer{
			{
				Address: "0",
			},
			{
				Address: "1",
			},
		},
		FeeCollectorList: []types.FeeCollector{
			{
				Index: "0",
			},
			{
				Index: "1",
			},
		},
		DevOperator: &types.DevOperator{
			Address: "28",
		},
		// this line is used by starport scaffolding # genesis/test/state
	}

	k, ctx := keepertest.RegionKeeper(t)
	region.InitGenesis(ctx, *k, genesisState)
	got := region.ExportGenesis(ctx, *k)
	require.NotNil(t, got)

	nullify.Fill(&genesisState)
	nullify.Fill(got)

	require.ElementsMatch(t, genesisState.RegionList, got.RegionList)
	// Dao removed from genesis
	require.ElementsMatch(t, genesisState.RelayerList, got.RelayerList)
	require.ElementsMatch(t, genesisState.FeeCollectorList, got.FeeCollectorList)
	require.Equal(t, genesisState.DevOperator, got.DevOperator)
	// this line is used by starport scaffolding # genesis/test/assert
}
