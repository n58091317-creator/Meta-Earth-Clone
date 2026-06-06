package keeper_test

import (
	"strconv"
	"testing"

	sdk "github.com/cosmos/cosmos-sdk/types"
	keepertest "github.com/st-chain/rollapp/testutil/keeper"
	"github.com/st-chain/rollapp/testutil/nullify"
	"github.com/st-chain/rollapp/x/kyc/keeper"
	"github.com/st-chain/rollapp/x/kyc/types"
	"github.com/stretchr/testify/require"
)

// Prevent strconv unused error
var _ = strconv.IntSize

func createNDidInfo(keeper *keeper.Keeper, ctx sdk.Context, n int) []types.DidInfo {
	items := make([]types.DidInfo, n)
	for i := range items {
		items[i].Did = strconv.Itoa(i)

		keeper.SetDidInfo(ctx, items[i])
	}
	return items
}

func TestDidInfoGet(t *testing.T) {
	keeper, ctx := keepertest.KycKeeper(t)
	items := createNDidInfo(keeper, ctx, 10)
	for _, item := range items {
		rst, found := keeper.GetDidInfo(ctx,
			item.Did,
		)
		require.True(t, found)
		require.Equal(t,
			nullify.Fill(&item),
			nullify.Fill(&rst),
		)
	}
}
func TestDidInfoRemove(t *testing.T) {
	keeper, ctx := keepertest.KycKeeper(t)
	items := createNDidInfo(keeper, ctx, 10)
	for _, item := range items {
		keeper.RemoveDidInfo(ctx,
			item.Did,
		)
		_, found := keeper.GetDidInfo(ctx,
			item.Did,
		)
		require.False(t, found)
	}
}

func TestDidInfoGetAll(t *testing.T) {
	keeper, ctx := keepertest.KycKeeper(t)
	items := createNDidInfo(keeper, ctx, 10)
	require.ElementsMatch(t,
		nullify.Fill(items),
		nullify.Fill(keeper.GetAllDidInfo(ctx)),
	)
}
