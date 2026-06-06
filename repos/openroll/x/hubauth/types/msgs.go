package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	"strings"
)

var (
	_ sdk.Msg = &MsgSetClientId{}
)

func NewMsgSetClientId(creator sdk.AccAddress, clientId, denomPath string) *MsgSetClientId {
	return &MsgSetClientId{
		Creator:   creator.String(),
		ClientId:  clientId,
		DenomPath: denomPath,
	}
}

func (msg *MsgSetClientId) Route() string {
	return RouterKey
}

func (msg *MsgSetClientId) Type() string {
	return "UpdateDao"
}

func (msg *MsgSetClientId) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic("invalid creator address")
	}
	return []sdk.AccAddress{creator}
}

func (msg *MsgSetClientId) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

func (msg *MsgSetClientId) ValidateBasic() error {
	if _, err := sdk.AccAddressFromBech32(msg.Creator); err != nil {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidAddress, msg.Creator)
	}
	if !strings.Contains(msg.ClientId, "07-tendermint") {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidRequest, "clientId %s invalid", msg.ClientId)
	}
	if !strings.Contains(msg.DenomPath, "transfer/channel-") {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidRequest, "clientId %s invalid", msg.ClientId)
	}
	return nil
}
