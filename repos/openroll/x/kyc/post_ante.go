package kyc

import (
	"strings"

	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	ibcClientTypes "github.com/cosmos/ibc-go/v6/modules/core/02-client/types"
	"github.com/st-chain/rollapp/x/kyc/types"
)

type RefundFee struct {
	bankKeeper       types.BankKeeper
	feeCollectorName string
}

func NewRefoundFee(bankKeeper types.BankKeeper, feeCollectorName string) *RefundFee {
	return &RefundFee{
		bankKeeper:       bankKeeper,
		feeCollectorName: feeCollectorName,
	}
}

// make sure the people who successfully update the light-client 07-tendermint-0 and kyc are free gas for that tx.
func (ci *RefundFee) AnteHandle(ctx sdk.Context, tx sdk.Tx, simulate bool, next sdk.AnteHandler) (newCtx sdk.Context, err error) {
	if ctx.IsCheckTx() {
		return next(ctx, tx, simulate)
	}
	//check if is check-in tx
	msgs := tx.GetMsgs()
	if len(msgs) == 0 {
		return next(ctx, tx, simulate)
	}
	isKycMsg := false
	for _, msg := range msgs {
		url := sdk.MsgTypeURL(msg)
		if !strings.HasPrefix(url, "/stchain.rollapp.kyc") {
			if url == "/ibc.core.client.v1.MsgUpdateClient" {
				updateClientMsg, ok := msg.(*ibcClientTypes.MsgUpdateClient)
				if ok {
					if updateClientMsg.ClientId == "07-tendermint-0" || updateClientMsg.ClientId == "07-tendermint-1" {
						continue
					}
				}
			}
			return next(ctx, tx, simulate)
		}
		isKycMsg = true
	}
	if !isKycMsg {
		return next(ctx, tx, simulate)
	}

	//refund fee
	feeTx, ok := tx.(sdk.FeeTx)
	if !ok {
		return ctx, sdkerrors.Wrap(sdkerrors.ErrTxDecode, "Tx must be a FeeTx")
	}

	feeCoins := feeTx.GetFee()
	ci.bankKeeper.SendCoinsFromModuleToAccount(ctx, ci.feeCollectorName, feeTx.FeePayer(), feeCoins)

	return next(ctx, tx, simulate)
}
