package simulation

import (
	"math/rand"

	"github.com/cosmos/cosmos-sdk/baseapp"
	sdk "github.com/cosmos/cosmos-sdk/types"
	simtypes "github.com/cosmos/cosmos-sdk/types/simulation"
	"github.com/st-chain/rollapp/x/kyc/keeper"
	"github.com/st-chain/rollapp/x/kyc/types"
)

func SimulateMsgUpdateKycInfo(
	ak types.AccountKeeper,
	bk types.BankKeeper,
	k keeper.Keeper,
) simtypes.Operation {
	return func(r *rand.Rand, app *baseapp.BaseApp, ctx sdk.Context, accs []simtypes.Account, chainID string,
	) (simtypes.OperationMsg, []simtypes.FutureOperation, error) {
		simAccount, _ := simtypes.RandomAcc(r, accs)
		msg := &types.MsgUpdateKycInfo{
			Creator: simAccount.Address.String(),
		}

		// TODO: Handling the UpdateKycInfo simulation

		return simtypes.NoOpMsg(types.ModuleName, msg.Type(), "UpdateKycInfo simulation not implemented"), nil, nil
	}
}
