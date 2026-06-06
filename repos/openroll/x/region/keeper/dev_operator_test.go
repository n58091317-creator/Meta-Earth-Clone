package keeper_test

import (
	"testing"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/stretchr/testify/require"

	keepertest "github.com/st-chain/rollapp/testutil/keeper"
	"github.com/st-chain/rollapp/testutil/nullify"
	"github.com/st-chain/rollapp/x/region/keeper"
	"github.com/st-chain/rollapp/x/region/types"
)

func createTestDevOperator(keeper *keeper.Keeper, ctx sdk.Context) types.DevOperator {
	item := types.DevOperator{}
	keeper.SetDevOperator(ctx, item)
	return item
}

func TestDevOperatorGet(t *testing.T) {
	keeper, ctx := keepertest.RegionKeeper(t)
	item := createTestDevOperator(keeper, ctx)
	rst, found := keeper.GetDevOperator(ctx)
	require.True(t, found)
	require.Equal(t,
		nullify.Fill(&item),
		nullify.Fill(&rst),
	)
}

func TestDevOperatorRemove(t *testing.T) {
	keeper, ctx := keepertest.RegionKeeper(t)
	createTestDevOperator(keeper, ctx)
	keeper.RemoveDevOperator(ctx)
	_, found := keeper.GetDevOperator(ctx)
	require.False(t, found)
}
