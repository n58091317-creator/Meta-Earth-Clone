package types

import (
	"github.com/cosmos/cosmos-sdk/codec"
	cdctypes "github.com/cosmos/cosmos-sdk/codec/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/msgservice"
)

func RegisterCodec(cdc *codec.LegacyAmino) {
	cdc.RegisterConcrete(&MsgUpdateDID{}, "kyc/UpdateDID", nil)
	cdc.RegisterConcrete(&MsgUpdateCredential{}, "kyc/UpdateCredential", nil)
	cdc.RegisterConcrete(&MsgRemoveKyc{}, "kyc/RemoveKyc", nil)
	cdc.RegisterConcrete(&MsgUpdateKycInfo{}, "kyc/UpdateKycInfo", nil)
	// this line is used by starport scaffolding # 2
}

func RegisterInterfaces(registry cdctypes.InterfaceRegistry) {
	registry.RegisterImplementations((*sdk.Msg)(nil),
		&MsgUpdateDID{},
	)
	registry.RegisterImplementations((*sdk.Msg)(nil),
		&MsgUpdateCredential{},
	)
	registry.RegisterImplementations((*sdk.Msg)(nil),
		&MsgRemoveKyc{},
	)
	registry.RegisterImplementations((*sdk.Msg)(nil),
		&MsgUpdateKycInfo{},
	)
	// this line is used by starport scaffolding # 3

	msgservice.RegisterMsgServiceDesc(registry, &_Msg_serviceDesc)

	msgservice.RegisterMsgServiceDesc(registry, &_Msg_serviceDesc)

	msgservice.RegisterMsgServiceDesc(registry, &_Msg_serviceDesc)
}

var (
	Amino     = codec.NewLegacyAmino()
	ModuleCdc = codec.NewProtoCodec(cdctypes.NewInterfaceRegistry())
)
