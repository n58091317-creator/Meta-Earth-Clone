package keeper_test

import (
	"testing"

	testkeeper "github.com/st-chain/rollapp/testutil/keeper"
	"github.com/st-chain/rollapp/x/region/types"
	"github.com/stretchr/testify/require"
)

func TestGetParams(t *testing.T) {
	k, ctx := testkeeper.RegionKeeper(t)
	params := types.DefaultParams()

	k.SetParams(ctx, params)

	require.EqualValues(t, params, k.GetParams(ctx))
}
