package keeper

import (
	"github.com/st-chain/rollapp/x/kyc/types"
)

var _ types.QueryServer = Keeper{}
