package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

const TypeMsgUpdateCredential = "update_credential"

var _ sdk.Msg = &MsgUpdateCredential{}

func NewMsgUpdateCredential(creator string, proofHeight uint64, credentials []*Item, proofs, storeProof, storeHash []byte) *MsgUpdateCredential {
	return &MsgUpdateCredential{
		Creator:     creator,
		ProofHeight: proofHeight,
		Proofs:      proofs,
		Credentials: credentials,
		StoreProof:  storeProof,
		StoreHash:   storeHash,
	}
}

func (msg *MsgUpdateCredential) Route() string {
	return RouterKey
}

func (msg *MsgUpdateCredential) Type() string {
	return TypeMsgUpdateCredential
}

func (msg *MsgUpdateCredential) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}

func (msg *MsgUpdateCredential) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

func (msg *MsgUpdateCredential) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address (%s)", err)
	}
	return nil
}
