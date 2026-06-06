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

func createNRelayer(keeper *keeper.Keeper, ctx sdk.Context, n int) []types.Relayer {
	items := make([]types.Relayer, n)
	for i := range items {
		items[i].Address = strconv.Itoa(i)

		keeper.SetRelayer(ctx, items[i])
	}
	return items
}

func TestRelayerGet(t *testing.T) {
	keeper, ctx := keepertest.RegionKeeper(t)
	items := createNRelayer(keeper, ctx, 10)
	for _, item := range items {
		rst, found := keeper.GetRelayer(ctx,
			item.Address,
		)
		require.True(t, found)
		require.Equal(t,
			nullify.Fill(&item),
			nullify.Fill(&rst),
		)
	}
}
func TestRelayerRemove(t *testing.T) {
	keeper, ctx := keepertest.RegionKeeper(t)
	items := createNRelayer(keeper, ctx, 10)
	for _, item := range items {
		keeper.RemoveRelayer(ctx,
			item.Address,
		)
		_, found := keeper.GetRelayer(ctx,
			item.Address,
		)
		require.False(t, found)
	}
}

func TestRelayerGetAll(t *testing.T) {
	keeper, ctx := keepertest.RegionKeeper(t)
	items := createNRelayer(keeper, ctx, 10)
	require.ElementsMatch(t,
		nullify.Fill(items),
		nullify.Fill(keeper.GetAllRelayer(ctx)),
	)
}
