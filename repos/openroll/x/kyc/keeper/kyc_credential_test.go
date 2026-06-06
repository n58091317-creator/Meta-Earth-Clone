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

func createNKYCCredential(keeper *keeper.Keeper, ctx sdk.Context, n int) []types.KYCCredential {
	items := make([]types.KYCCredential, n)
	for i := range items {
		items[i].Did = strconv.Itoa(i)

		keeper.SetKYCCredential(ctx, items[i])
	}
	return items
}

func TestKYCCredentialGet(t *testing.T) {
	keeper, ctx := keepertest.KycKeeper(t)
	items := createNKYCCredential(keeper, ctx, 10)
	for _, item := range items {
		rst, found := keeper.GetKYCCredential(ctx,
			item.Did,
		)
		require.True(t, found)
		require.Equal(t,
			nullify.Fill(&item),
			nullify.Fill(&rst),
		)
	}
}
func TestKYCCredentialRemove(t *testing.T) {
	keeper, ctx := keepertest.KycKeeper(t)
	items := createNKYCCredential(keeper, ctx, 10)
	for _, item := range items {
		keeper.RemoveKYCCredential(ctx,
			item.Did,
		)
		_, found := keeper.GetKYCCredential(ctx,
			item.Did,
		)
		require.False(t, found)
	}
}

func TestKYCCredentialGetAll(t *testing.T) {
	keeper, ctx := keepertest.KycKeeper(t)
	items := createNKYCCredential(keeper, ctx, 10)
	require.ElementsMatch(t,
		nullify.Fill(items),
		nullify.Fill(keeper.GetAllKYCCredential(ctx)),
	)
}
