package app

import (
	"fmt"
	"strings"

	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	"github.com/cosmos/cosmos-sdk/x/auth/ante"
	"github.com/cosmos/cosmos-sdk/x/auth/types"
	hubauthkeeper "github.com/st-chain/rollapp/x/hubauth/keeper"
	kycKeeper "github.com/st-chain/rollapp/x/kyc/keeper"
	regionkeeper "github.com/st-chain/rollapp/x/region/keeper"
	regiontypes "github.com/st-chain/rollapp/x/region/types"
)

// DeductFeeDecorator deducts fees from the first signer of the tx
// If the first signer does not have the funds to pay for the fees, return with InsufficientFunds error
// Call next AnteHandler if fees successfully deducted
// CONTRACT: Tx must implement FeeTx interface to use DeductFeeDecorator
type DeductFeeDecorator struct {
	accountKeeper  ante.AccountKeeper
	bankKeeper     types.BankKeeper
	feegrantKeeper ante.FeegrantKeeper
	hubauthuKeeper hubauthkeeper.Keeper
	regionKeeper   regionkeeper.Keeper
	kycKeeper      kycKeeper.Keeper
	txFeeChecker   TxFeeChecker
}

type TxFeeChecker func(ctx sdk.Context, tx sdk.Tx, hubAuthKeeper hubauthkeeper.Keeper, regionKeeper regionkeeper.Keeper, simulate bool) (sdk.Coins, int64, error)

func NewDeductFeeDecorator(ak ante.AccountKeeper, bk types.BankKeeper, fk ante.FeegrantKeeper, regionKeeper regionkeeper.Keeper, hubauthKeeper hubauthkeeper.Keeper, kycKeeper kycKeeper.Keeper) DeductFeeDecorator {

	return DeductFeeDecorator{
		accountKeeper:  ak,
		bankKeeper:     bk,
		feegrantKeeper: fk,
		txFeeChecker:   checkTxFeeWithValidatorMinGasPrices,
		hubauthuKeeper: hubauthKeeper,
		regionKeeper:   regionKeeper,
		kycKeeper:      kycKeeper,
	}
}

func (dfd DeductFeeDecorator) AnteHandle(ctx sdk.Context, tx sdk.Tx, simulate bool, next sdk.AnteHandler) (sdk.Context, error) {
	feeTx, ok := tx.(sdk.FeeTx)
	if !ok {
		return ctx, sdkerrors.Wrap(sdkerrors.ErrTxDecode, "Tx must be a FeeTx")
	}

	if !simulate && ctx.BlockHeight() > 0 && feeTx.GetGas() == 0 {
		return ctx, sdkerrors.Wrap(sdkerrors.ErrInvalidGasLimit, "must provide positive gas")
	}

	var (
		priority int64
		err      error
	)

	fee, priority, err := dfd.txFeeChecker(ctx, tx, dfd.hubauthuKeeper, dfd.regionKeeper, simulate)
	if err != nil {
		return ctx, err
	}

	if err := dfd.checkDeductFee(ctx, tx, fee); err != nil {
		return ctx, err
	}

	newCtx := ctx.WithPriority(priority)

	return next(newCtx, tx, simulate)
}

func (dfd DeductFeeDecorator) checkDeductFee(ctx sdk.Context, sdkTx sdk.Tx, fee sdk.Coins) error {
	feeTx, ok := sdkTx.(sdk.FeeTx)
	if !ok {
		return sdkerrors.Wrap(sdkerrors.ErrTxDecode, "Tx must be a FeeTx")
	}

	if addr := dfd.accountKeeper.GetModuleAddress(types.FeeCollectorName); addr == nil {
		return fmt.Errorf("fee collector module account (%s) has not been set", types.FeeCollectorName)
	}

	feePayer := feeTx.FeePayer()
	feeGranter := feeTx.FeeGranter()
	deductFeesFrom := feePayer

	// if feegranter set deduct fee from feegranter account.
	// this works with only when feegrant enabled.
	if feeGranter != nil {
		if dfd.feegrantKeeper == nil {
			return sdkerrors.ErrInvalidRequest.Wrap("fee grants are not enabled")
		} else if !feeGranter.Equals(feePayer) {
			err := dfd.feegrantKeeper.UseGrantedFees(ctx, feeGranter, feePayer, fee, sdkTx.GetMsgs())
			if err != nil {
				return sdkerrors.Wrapf(err, "%s does not not allow to pay fees for %s", feeGranter, feePayer)
			}
		}

		deductFeesFrom = feeGranter
	}

	deductFeesFromAcc := dfd.accountKeeper.GetAccount(ctx, deductFeesFrom)
	if deductFeesFromAcc == nil {
		return sdkerrors.ErrUnknownAddress.Wrapf("fee payer address: %s does not exist", deductFeesFrom)
	}

	// deduct the fees
	if !fee.IsZero() {
		err := dfd.DeductFees(ctx, deductFeesFromAcc, fee)
		if err != nil {
			return err
		}
		events := sdk.Events{
			sdk.NewEvent(
				sdk.EventTypeTx,
				sdk.NewAttribute(sdk.AttributeKeyFee, fee.String()),
				sdk.NewAttribute(sdk.AttributeKeyFeePayer, deductFeesFrom.String()),
			),
		}
		ctx.EventManager().EmitEvents(events)
	}

	return nil
}

// DeductFees deducts fees from the given account.
func (dfd DeductFeeDecorator) DeductFees(ctx sdk.Context, acc types.AccountI, fees sdk.Coins) error {
	if !fees.IsValid() {
		return sdkerrors.Wrapf(sdkerrors.ErrInsufficientFee, "invalid fee amount: %s", fees)
	}
	//filter fees not IBC coin
	ibcFees := sdk.NewCoins()
	notIbcConis := sdk.NewCoins()
	for _, coin := range fees {
		if strings.HasPrefix(strings.ToLower(coin.Denom), "ibc/") {
			ibcFees = append(ibcFees, coin)
		} else {
			notIbcConis = append(notIbcConis, coin)
		}
	}
	if !ibcFees.IsZero() {

		addr, err := sdk.Bech32ifyAddressBytes(sdk.GetConfig().GetBech32AccountAddrPrefix(), acc.GetAddress().Bytes())
		if err != nil {
			return sdkerrors.Wrap(sdkerrors.ErrInvalidAddress, "invalid address")
		}
		kycI, found := dfd.kycKeeper.GetAddressKYC(ctx, addr)
		if !found {
			// send fee to global_gas_fee_pool
			err := dfd.bankKeeper.SendCoinsFromAccountToModule(ctx, acc.GetAddress(), regiontypes.GlobalGasFeePool, ibcFees)
			if err != nil {
				return sdkerrors.Wrapf(sdkerrors.ErrInsufficientFunds, err.Error())
			}
			return nil
		}
		regionI, found := dfd.regionKeeper.GetRegionI(ctx, kycI.GetRegion())
		if !found {
			return sdkerrors.Wrap(sdkerrors.ErrInvalidAddress, "invalid address: not in any region")
		}
		err = dfd.bankKeeper.SendCoinsFromAccountToModule(ctx, acc.GetAddress(), HubFeeCollectorName, ibcFees)
		if err != nil {
			return sdkerrors.Wrapf(sdkerrors.ErrInsufficientFunds, err.Error())
		}
		AddFeeToRegionFeeCollector(ctx, dfd.regionKeeper, regionI.GetOperatorAddress(), ibcFees)
	}
	if !notIbcConis.IsZero() {
		err := dfd.bankKeeper.SendCoinsFromAccountToModule(ctx, acc.GetAddress(), types.FeeCollectorName, notIbcConis)
		if err != nil {
			return sdkerrors.Wrapf(sdkerrors.ErrInsufficientFunds, err.Error())
		}
	}

	return nil
}

func AddFeeToRegionFeeCollector(ctx sdk.Context, regionKeeper regionkeeper.Keeper, opAddr string, fees sdk.Coins) {
	col, found := regionKeeper.GetFeeCollector(ctx, opAddr)
	if !found {
		col = regiontypes.FeeCollector{
			Index: opAddr,
			Fees:  sdk.NewCoins(),
		}
	}
	have := sdk.Coins(col.Fees)
	result := have.Add(fees...)
	col.Fees = result
	regionKeeper.SetFeeCollector(ctx, col)
}
