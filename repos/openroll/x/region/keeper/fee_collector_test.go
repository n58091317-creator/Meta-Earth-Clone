package keeper_test

import (
	"strconv"
	"testing"

	sdk "github.com/cosmos/cosmos-sdk/types"
	keepertest "github.com/st-chain/rollapp/testutil/keeper"
	"github.com/st-chain/rollapp/testutil/nullify"
	"github.com/st-chain/rollapp/x/region/keeper"
	"github.com/st-chain/rollapp/x/region/types"
	"github.com/stretchr/testify/require"
)

// Prevent strconv unused error
var _ = strconv.IntSize

func createNFeeCollector(keeper *keeper.Keeper, ctx sdk.Context, n int) []types.FeeCollector {
	items := make([]types.FeeCollector, n)
	for i := range items {
		items[i].Index = strconv.Itoa(i)

		keeper.SetFeeCollector(ctx, items[i])
	}
	return items
}

func TestFeeCollectorGet(t *testing.T) {
	keeper, ctx := keepertest.RegionKeeper(t)
	items := createNFeeCollector(keeper, ctx, 10)
	for _, item := range items {
		rst, found := keeper.GetFeeCollector(ctx,
			item.Index,
		)
		require.True(t, found)
		require.Equal(t,
			nullify.Fill(&item),
			nullify.Fill(&rst),
		)
	}
}
func TestFeeCollectorRemove(t *testing.T) {
	keeper, ctx := keepertest.RegionKeeper(t)
	items := createNFeeCollector(keeper, ctx, 10)
	for _, item := range items {
		keeper.RemoveFeeCollector(ctx,
			item.Index,
		)
		_, found := keeper.GetFeeCollector(ctx,
			item.Index,
		)
		require.False(t, found)
	}
}

func TestFeeCollectorGetAll(t *testing.T) {
	keeper, ctx := keepertest.RegionKeeper(t)
	items := createNFeeCollector(keeper, ctx, 10)
	require.ElementsMatch(t,
		nullify.Fill(items),
		nullify.Fill(keeper.GetAllFeeCollector(ctx)),
	)
}
