package keeper_test

import (
	"strconv"
	"testing"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/query"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	keepertest "github.com/st-chain/rollapp/testutil/keeper"
	"github.com/st-chain/rollapp/testutil/nullify"
	"github.com/st-chain/rollapp/x/region/types"
)

// Prevent strconv unused error
var _ = strconv.IntSize

func TestFeeCollectorQuerySingle(t *testing.T) {
	keeper, ctx := keepertest.RegionKeeper(t)
	wctx := sdk.WrapSDKContext(ctx)
	msgs := createNFeeCollector(keeper, ctx, 2)
	for _, tc := range []struct {
		desc     string
		request  *types.QueryGetFeeCollectorRequest
		response *types.QueryGetFeeCollectorResponse
		err      error
	}{
		{
			desc: "First",
			request: &types.QueryGetFeeCollectorRequest{
				Index: msgs[0].Index,
			},
			response: &types.QueryGetFeeCollectorResponse{FeeCollector: msgs[0]},
		},
		{
			desc: "Second",
			request: &types.QueryGetFeeCollectorRequest{
				Index: msgs[1].Index,
			},
			response: &types.QueryGetFeeCollectorResponse{FeeCollector: msgs[1]},
		},
		{
			desc: "KeyNotFound",
			request: &types.QueryGetFeeCollectorRequest{
				Index: strconv.Itoa(100000),
			},
			err: status.Error(codes.NotFound, "not found"),
		},
		{
			desc: "InvalidRequest",
			err:  status.Error(codes.InvalidArgument, "invalid request"),
		},
	} {
		t.Run(tc.desc, func(t *testing.T) {
			response, err := keeper.FeeCollector(wctx, tc.request)
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

func TestFeeCollectorQueryPaginated(t *testing.T) {
	keeper, ctx := keepertest.RegionKeeper(t)
	wctx := sdk.WrapSDKContext(ctx)
	msgs := createNFeeCollector(keeper, ctx, 5)

	request := func(next []byte, offset, limit uint64, total bool) *types.QueryAllFeeCollectorRequest {
		return &types.QueryAllFeeCollectorRequest{
			Pagination: &query.PageRequest{
				Key:        next,
				Offset:     offset,
				Limit:      limit,
				CountTotal: total,
			},
		}
	}
	t.Run("ByOffset", func(t *testing.T) {
		step := 2
		for i := 0; i < len(msgs); i += step {
			resp, err := keeper.FeeCollectorAll(wctx, request(nil, uint64(i), uint64(step), false))
			require.NoError(t, err)
			require.LessOrEqual(t, len(resp.FeeCollector), step)
			require.Subset(t,
				nullify.Fill(msgs),
				nullify.Fill(resp.FeeCollector),
			)
		}
	})
	t.Run("ByKey", func(t *testing.T) {
		step := 2
		var next []byte
		for i := 0; i < len(msgs); i += step {
			resp, err := keeper.FeeCollectorAll(wctx, request(next, 0, uint64(step), false))
			require.NoError(t, err)
			require.LessOrEqual(t, len(resp.FeeCollector), step)
			require.Subset(t,
				nullify.Fill(msgs),
				nullify.Fill(resp.FeeCollector),
			)
			next = resp.Pagination.NextKey
		}
	})
	t.Run("Total", func(t *testing.T) {
		resp, err := keeper.FeeCollectorAll(wctx, request(nil, 0, 0, true))
		require.NoError(t, err)
		require.Equal(t, len(msgs), int(resp.Pagination.Total))
		require.ElementsMatch(t,
			nullify.Fill(msgs),
			nullify.Fill(resp.FeeCollector),
		)
	})
	t.Run("InvalidRequest", func(t *testing.T) {
		_, err := keeper.FeeCollectorAll(wctx, nil)
		require.ErrorIs(t, err, status.Error(codes.InvalidArgument, "invalid request"))
	})
}
