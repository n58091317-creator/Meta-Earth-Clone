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

func createNDid(keeper *keeper.Keeper, ctx sdk.Context, n int) []types.Did {
	items := make([]types.Did, n)
	for i := range items {
		items[i].Address = strconv.Itoa(i)

		keeper.SetDid(ctx, items[i])
	}
	return items
}

func TestDidGet(t *testing.T) {
	keeper, ctx := keepertest.KycKeeper(t)
	items := createNDid(keeper, ctx, 10)
	for _, item := range items {
		rst, found := keeper.GetDid(ctx,
			item.Address,
		)
		require.True(t, found)
		require.Equal(t,
			nullify.Fill(&item),
			nullify.Fill(&rst),
		)
	}
}
func TestDidRemove(t *testing.T) {
	keeper, ctx := keepertest.KycKeeper(t)
	items := createNDid(keeper, ctx, 10)
	for _, item := range items {
		keeper.RemoveDid(ctx,
			item.Address,
		)
		_, found := keeper.GetDid(ctx,
			item.Address,
		)
		require.False(t, found)
	}
}

func TestDidGetAll(t *testing.T) {
	keeper, ctx := keepertest.KycKeeper(t)
	items := createNDid(keeper, ctx, 10)
	require.ElementsMatch(t,
		nullify.Fill(items),
		nullify.Fill(keeper.GetAllDid(ctx)),
	)
}
