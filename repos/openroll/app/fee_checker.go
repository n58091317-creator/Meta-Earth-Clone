package app

import (
	"math"

	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	hubauthkeeper "github.com/st-chain/rollapp/x/hubauth/keeper"
	regionKeeper "github.com/st-chain/rollapp/x/region/keeper"
)

// base ibc fee 0.0001mec=0.0001*10000_0000umec=10000umec
var baseIbcFeesRequired = sdk.NewInt(10000)

// checkTxFeeWithValidatorMinGasPrices implements the default fee logic, where the minimum price per
// unit of gas is fixed and set by each validator, can the tx priority is computed from the gas price.
func checkTxFeeWithValidatorMinGasPrices(ctx sdk.Context, tx sdk.Tx, hubAuthKeeper hubauthkeeper.Keeper, regionKeeper regionKeeper.Keeper, simulate bool) (sdk.Coins, int64, error) {
	feeTx, ok := tx.(sdk.FeeTx)
	if !ok {
		return nil, 0, sdkerrors.Wrap(sdkerrors.ErrTxDecode, "Tx must be a FeeTx")
	}

	feeCoins := feeTx.GetFee()
	gas := feeTx.GetGas()
	// if is relayer or freeGasUrlList, return the fee and priority
	acc := feeTx.FeePayer()
	addr, err := sdk.Bech32ifyAddressBytes(sdk.GetConfig().GetBech32AccountAddrPrefix(), acc.Bytes())
	if err != nil {
		return nil, 0, sdkerrors.Wrap(sdkerrors.ErrInvalidAddress, "invalid address")
	}

	if _, found := regionKeeper.GetRelayer(ctx, addr); found {
		return sdk.NewCoins(), 99, nil
	}
	if simulate {
		return feeCoins, 0, nil
	}

	// Ensure that the provided fees meet a minimum threshold for the validator,
	// if this is a CheckTx. This is only for local mempool purposes, and thus
	// is only ran on check tx.
	if ctx.IsCheckTx() {
		minGasPrices := ctx.MinGasPrices()
		ibcMiniGasPrice := getHubMiniGasPrice(minGasPrices)
		requiredFees := make(sdk.Coins, len(minGasPrices))
		if !minGasPrices.IsZero() {
			// Determine the required fees by multiplying each required minimum gas
			// price by the gas limit, where fee = ceil(minGasPrice * gasLimit).
			glDec := sdk.NewDec(int64(gas))
			for i, gp := range minGasPrices {
				fee := gp.Amount.Mul(glDec)
				requiredFees[i] = sdk.NewCoin(gp.Denom, fee.Ceil().RoundInt())
			}
		}

		//check fee for use umec
		ibcAmount := sdk.NewInt(0)
		for _, coin := range feeCoins {
			ok, err := hubAuthKeeper.VerifyIBCDenomFromHub(ctx, coin.Denom)
			if err != nil || !ok {
				continue
			}
			ibcAmount = ibcAmount.Add(coin.Amount)
		}
		ibcGasPrice := sdk.NewDecFromInt(ibcAmount).QuoInt64(int64(gas))
		if ibcAmount.GTE(baseIbcFeesRequired) && ibcGasPrice.GTE(ibcMiniGasPrice.Amount) {
			priority := getTxPriority(feeCoins, int64(gas))
			return feeCoins, priority, nil
		}

		//check fee for minGasPrices
		if len(requiredFees) != 0 && feeCoins.IsAnyGTE(requiredFees) {
			priority := getTxPriority(feeCoins, int64(gas))
			return feeCoins, priority, nil
		}
		if len(requiredFees) != 0 {
			return nil, 0, sdkerrors.Wrapf(sdkerrors.ErrInsufficientFee, "insufficient fees; got: %s required: %s or price : %s ibc/umec, and gas fees is required :%s ibc/umec", feeCoins, requiredFees, ibcMiniGasPrice.String(), baseIbcFeesRequired.String())
		}

	}

	priority := getTxPriority(feeCoins, int64(gas))
	return feeCoins, priority, nil
}

// getTxPriority returns a naive tx priority based on the amount of the smallest denomination of the gas price
// provided in a transaction.
// NOTE: This implementation should be used with a great consideration as it opens potential attack vectors
// where txs with multiple coins could not be prioritize as expected.
func getTxPriority(fee sdk.Coins, gas int64) int64 {
	var priority int64
	for _, c := range fee {
		p := int64(math.MaxInt64)
		gasPrice := c.Amount.QuoRaw(gas)
		if gasPrice.IsInt64() {
			p = gasPrice.Int64()
		}
		if priority == 0 || p < priority {
			priority = p
		}
	}

	return priority
}

func getHubMiniGasPrice(Price sdk.DecCoins) sdk.DecCoin {
	for _, p := range Price {
		if p.Denom == "umec" {
			return p
		}
	}
	return sdk.NewDecCoin("umec", sdk.NewInt(0))
}
