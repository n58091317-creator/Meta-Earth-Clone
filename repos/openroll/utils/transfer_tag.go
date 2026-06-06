package utils

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	bankkeeper "github.com/cosmos/cosmos-sdk/x/bank/keeper"
	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"
	abci "github.com/tendermint/tendermint/abci/types"
)

type BankKeeperExtend struct {
	bankkeeper.BaseKeeper
	ak banktypes.AccountKeeper
}

func NewBankKeeperExtend(
	ak banktypes.AccountKeeper,
	bk bankkeeper.Keeper,

) BankKeeperExtend {

	return BankKeeperExtend{
		BaseKeeper: bk.(bankkeeper.BaseKeeper),
		ak:         ak,
	}
}

// SendCoinsFromModuleToAccount transfers coins from a ModuleAccount to an AccAddress.
// It will panic if the module account does not exist. An error is returned if
// the recipient address is black-listed or if sending the tokens fails.
func (k BankKeeperExtend) SendCoinsFromModuleToAccountWithTag(
	ctx sdk.Context, senderModule string, recipientAddr sdk.AccAddress, amt sdk.Coins, tag ...string,
) error {
	senderAddr := k.ak.GetModuleAddress(senderModule)
	if senderAddr == nil {
		panic(sdkerrors.Wrapf(sdkerrors.ErrUnknownAddress, "module account %s does not exist", senderModule))
	}

	if k.BlockedAddr(recipientAddr) {
		return sdkerrors.Wrapf(sdkerrors.ErrUnauthorized, "%s is not allowed to receive funds", recipientAddr)
	}

	return k.SendCoinsWithTag(ctx, senderAddr, recipientAddr, amt, tag...)
}

// SendCoinsFromModuleToModule transfers coins from a ModuleAccount to another.
// It will panic if either module account does not exist.
func (k BankKeeperExtend) SendCoinsFromModuleToModuleWithTag(
	ctx sdk.Context, senderModule, recipientModule string, amt sdk.Coins, tag ...string,
) error {
	senderAddr := k.ak.GetModuleAddress(senderModule)
	if senderAddr == nil {
		panic(sdkerrors.Wrapf(sdkerrors.ErrUnknownAddress, "module account %s does not exist", senderModule))
	}

	recipientAcc := k.ak.GetModuleAccount(ctx, recipientModule)
	if recipientAcc == nil {
		panic(sdkerrors.Wrapf(sdkerrors.ErrUnknownAddress, "module account %s does not exist", recipientModule))
	}

	return k.SendCoinsWithTag(ctx, senderAddr, recipientAcc.GetAddress(), amt, tag...)
}

// SendCoinsFromAccountToModule transfers coins from an AccAddress to a ModuleAccount.
// It will panic if the module account does not exist.
func (k BankKeeperExtend) SendCoinsFromAccountToModuleWithTag(
	ctx sdk.Context, senderAddr sdk.AccAddress, recipientModule string, amt sdk.Coins, tag ...string,
) error {
	recipientAcc := k.ak.GetModuleAccount(ctx, recipientModule)
	if recipientAcc == nil {
		panic(sdkerrors.Wrapf(sdkerrors.ErrUnknownAddress, "module account %s does not exist", recipientModule))
	}

	return k.SendCoinsWithTag(ctx, senderAddr, recipientAcc.GetAddress(), amt, tag...)
}

func (k BankKeeperExtend) SendCoinsWithTag(ctx sdk.Context, fromAddr sdk.AccAddress, toAddr sdk.AccAddress, amt sdk.Coins, tag ...string) error {
	err := k.SendCoins(ctx, fromAddr, toAddr, amt)
	if err != nil {
		return err
	}
	l := len(ctx.EventManager().Events()) - 2

	for _, t := range tag {
		ctx.EventManager().Events()[l].Attributes = append(ctx.EventManager().Events()[l].Attributes, abci.EventAttribute{
			Key:   []byte("tag"),
			Value: []byte(t),
		})
	}

	return nil
}
