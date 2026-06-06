package region

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/st-chain/rollapp/x/region/types"
)

func (app AppModule) DistributionTxFees(ctx sdk.Context) {

	// get the current block height
	blockHeight := ctx.BlockHeight()
	if blockHeight%1000 != 0 {
		return
	}
	globalFees := sdk.NewCoins()
	devFees := sdk.NewCoins()
	//get region fee collectors
	feeCollectors := app.keeper.GetAllFeeCollector(ctx)
	for _, fc := range feeCollectors {
		regionOpFees := sdk.NewCoins()
		for _, fee := range fc.Fees {
			c7, c2, c1 := distributionCoins(fee)
			globalFees = globalFees.Add(c7)
			devFees = devFees.Add(c1)
			regionOpFees = regionOpFees.Add(c2)
		}
		oValAddr, err := sdk.ValAddressFromBech32(fc.Index)
		if err != nil {
			panic(err)
		}
		if !regionOpFees.IsZero() {
			err = app.bankKeeper.SendCoinsFromModuleToAccount(ctx, app.keeper.HubFeeCollectorName, sdk.AccAddress(oValAddr), regionOpFees)
			if err != nil {
				panic(err)
			}
		}

	}
	//send global fees
	if !globalFees.IsZero() {
		err := app.bankKeeper.SendCoinsFromModuleToModule(ctx, app.keeper.HubFeeCollectorName, types.GlobalGasFeePool, globalFees)
		if err != nil {
			panic(err)
		}
	}

	//send dev fees
	if !devFees.IsZero() {
		if devAddr, found := app.keeper.GetDevOperator(ctx); found {
			acc := sdk.MustAccAddressFromBech32(devAddr.Address)
			err := app.bankKeeper.SendCoinsFromModuleToAccount(ctx, app.keeper.HubFeeCollectorName, acc, devFees)
			if err != nil {
				panic(err)
			}
		}
	}

	//reset fee collector
	app.keeper.RemoveAllFeeCollector(ctx)
}

func distributionCoins(coin sdk.Coin) (c7, c2, c1 sdk.Coin) {
	totalAmount := sdk.NewDecCoin(coin.Denom, coin.Amount)
	amount10 := totalAmount.Amount.Mul(sdk.NewDecWithPrec(10, 2)).TruncateInt()
	amount20 := totalAmount.Amount.Mul(sdk.NewDecWithPrec(20, 2)).TruncateInt()
	amount70 := coin.Amount.Sub(amount10).Sub(amount20)

	c1 = sdk.NewCoin(coin.Denom, amount10)
	c2 = sdk.NewCoin(coin.Denom, amount20)
	c7 = sdk.NewCoin(coin.Denom, amount70)

	return
}
