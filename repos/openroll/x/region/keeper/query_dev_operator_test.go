package keeper_test

import (
	"testing"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	keepertest "github.com/st-chain/rollapp/testutil/keeper"
	"github.com/st-chain/rollapp/testutil/nullify"
	"github.com/st-chain/rollapp/x/region/types"
)

func TestDevOperatorQuery(t *testing.T) {
	keeper, ctx := keepertest.RegionKeeper(t)
	wctx := sdk.WrapSDKContext(ctx)
	item := createTestDevOperator(keeper, ctx)
	for _, tc := range []struct {
		desc     string
		request  *types.QueryGetDevOperatorRequest
		response *types.QueryGetDevOperatorResponse
		err      error
	}{
		{
			desc:     "First",
			request:  &types.QueryGetDevOperatorRequest{},
			response: &types.QueryGetDevOperatorResponse{DevOperator: item},
		},
		{
			desc: "InvalidRequest",
			err:  status.Error(codes.InvalidArgument, "invalid request"),
		},
	} {
		t.Run(tc.desc, func(t *testing.T) {
			response, err := keeper.DevOperator(wctx, tc.request)
			if tc.err != nil {
				require.ErrorIs(t, err, tc.err)
			} else {
				require.NoError(t, err)
				require.Equal(t,
					nullify.Fill(tc.response),
					nullify.Fill(response),
				)
			}
		})
	}
}
