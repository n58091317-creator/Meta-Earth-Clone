package keeper_test

import (
	"context"
	"testing"

	sdk "github.com/cosmos/cosmos-sdk/types"
	keepertest "github.com/st-chain/rollapp/testutil/keeper"
	"github.com/st-chain/rollapp/x/hubauth/keeper"
	"github.com/st-chain/rollapp/x/hubauth/types"
)

func setupMsgServer(t testing.TB) (types.MsgServer, context.Context) {
	k, ctx := keepertest.HubauthKeeper(t)
	return keeper.NewMsgServerImpl(*k), sdk.WrapSDKContext(ctx)
}
