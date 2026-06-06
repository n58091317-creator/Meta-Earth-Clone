package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

const TypeMsgUpdateRegion = "update_region"

var _ sdk.Msg = &MsgUpdateRegion{}

func NewMsgUpdateRegion(creator string, proofHeight uint64, storeHash []byte, storeProof []byte, proofs []byte, regions []*Item) *MsgUpdateRegion {
	return &MsgUpdateRegion{
		Creator:     creator,
		ProofHeight: proofHeight,
		StoreHash:   storeHash,
		StoreProof:  storeProof,
		Proofs:      proofs,
		Regions:     regions,
	}
}

func (msg *MsgUpdateRegion) Route() string { return RouterKey }

func (msg *MsgUpdateRegion) Type() string { return TypeMsgUpdateRegion }

func (msg *MsgUpdateRegion) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}

func (msg *MsgUpdateRegion) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

func (msg *MsgUpdateRegion) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address (%s)", err)
	}
	return nil
}
