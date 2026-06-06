package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

const TypeMsgUpdateKycInfo = "update_kyc_info"

var _ sdk.Msg = &MsgUpdateKycInfo{}

func NewMsgUpdateKycInfo(creator string, proofHeight uint64, storeHash []byte, storeProof []byte, proofs []byte, didInfos []*Item) *MsgUpdateKycInfo {
	return &MsgUpdateKycInfo{
		Creator:     creator,
		ProofHeight: proofHeight,
		StoreHash:   storeHash,
		StoreProof:  storeProof,
		Proofs:      proofs,
		DidInfos:    didInfos,
	}
}

func (msg *MsgUpdateKycInfo) Route() string {
	return RouterKey
}

func (msg *MsgUpdateKycInfo) Type() string {
	return TypeMsgUpdateKycInfo
}

func (msg *MsgUpdateKycInfo) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}

func (msg *MsgUpdateKycInfo) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

func (msg *MsgUpdateKycInfo) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address (%s)", err)
	}
	return nil
}
