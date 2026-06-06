package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

const (
	TypeMsgCreateRelayer = "create_relayer"
	TypeMsgUpdateRelayer = "update_relayer"
	TypeMsgDeleteRelayer = "delete_relayer"
)

var _ sdk.Msg = &MsgCreateRelayer{}
var _ sdk.Msg = &MsgUpdateRelayer{}
var _ sdk.Msg = &MsgDeleteRelayer{}

func NewMsgCreateRelayer(creator string, address string) *MsgCreateRelayer {
	return &MsgCreateRelayer{
		Creator: creator,
		Address: address,
	}
}

func (msg *MsgCreateRelayer) Route() string { return RouterKey }
func (msg *MsgCreateRelayer) Type() string  { return TypeMsgCreateRelayer }
func (msg *MsgCreateRelayer) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}
func (msg *MsgCreateRelayer) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}
func (msg *MsgCreateRelayer) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address (%s)", err)
	}
	return nil
}

func NewMsgUpdateRelayer(creator string, address string) *MsgUpdateRelayer {
	return &MsgUpdateRelayer{Creator: creator, Address: address}
}

func (msg *MsgUpdateRelayer) Route() string { return RouterKey }
func (msg *MsgUpdateRelayer) Type() string  { return TypeMsgUpdateRelayer }
func (msg *MsgUpdateRelayer) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}
func (msg *MsgUpdateRelayer) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}
func (msg *MsgUpdateRelayer) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address (%s)", err)
	}
	return nil
}

func NewMsgDeleteRelayer(creator string, address string) *MsgDeleteRelayer {
	return &MsgDeleteRelayer{Creator: creator, Address: address}
}

func (msg *MsgDeleteRelayer) Route() string { return RouterKey }
func (msg *MsgDeleteRelayer) Type() string  { return TypeMsgDeleteRelayer }
func (msg *MsgDeleteRelayer) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}
func (msg *MsgDeleteRelayer) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}
func (msg *MsgDeleteRelayer) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address (%s)", err)
	}
	return nil
}
