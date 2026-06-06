package keeper_test

import (
	"testing"

	testkeeper "github.com/st-chain/rollapp/testutil/keeper"
	"github.com/st-chain/rollapp/x/hubauth/types"
	"github.com/stretchr/testify/require"
)

func TestGetParams(t *testing.T) {
	k, ctx := testkeeper.HubauthKeeper(t)
	params := types.DefaultParams()

	k.SetParams(ctx, params)

	require.EqualValues(t, params, k.GetParams(ctx))
	require.EqualValues(t, params.ClientId, k.ClientId(ctx))
}
