package keeper

import (
	"github.com/st-chain/rollapp/x/region/types"
)

var _ types.QueryServer = Keeper{}
