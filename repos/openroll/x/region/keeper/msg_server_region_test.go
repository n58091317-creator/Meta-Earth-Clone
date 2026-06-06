package keeper_test

import (
	"strconv"
	"testing"

	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	"github.com/stretchr/testify/require"

	keepertest "github.com/st-chain/rollapp/testutil/keeper"
	"github.com/st-chain/rollapp/x/region/keeper"
	"github.com/st-chain/rollapp/x/region/types"
)

// Prevent strconv unused error
var _ = strconv.IntSize

func TestRegionMsgServerUpdate(t *testing.T) {
	creator := "A"

	for _, tc := range []struct {
		desc      string
		request   *types.MsgUpdateRegion
		regionIDs []string
		err       error
	}{
		{
			desc:    "Completed",
			request: &types.MsgUpdateRegion{Creator: creator}, //TODO:

		},
		{
			desc:    "Unauthorized",
			request: &types.MsgUpdateRegion{Creator: "B"}, //TODO:

			err: sdkerrors.ErrUnauthorized,
		},
		{
			desc:    "KeyNotFound",
			request: &types.MsgUpdateRegion{Creator: creator}, //TODO:

			err: sdkerrors.ErrKeyNotFound,
		},
	} {
		t.Run(tc.desc, func(t *testing.T) {
			k, ctx := keepertest.RegionKeeper(t)
			srv := keeper.NewMsgServerImpl(*k)
			wctx := sdk.WrapSDKContext(ctx)

			_, err := srv.UpdateRegion(wctx, tc.request)
			if tc.err != nil {
				require.ErrorIs(t, err, tc.err)
			} else {
				require.NoError(t, err)
				for _, id := range tc.regionIDs {
					rst, found := k.GetRegion(ctx,
						id,
					)
					require.True(t, found)
					require.Equal(t, id, rst.RegionId)
				}
			}
		})
	}
}
