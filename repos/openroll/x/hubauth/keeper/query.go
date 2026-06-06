package keeper

import (
	"github.com/st-chain/rollapp/x/hubauth/types"
)

var _ types.QueryServer = Keeper{}
