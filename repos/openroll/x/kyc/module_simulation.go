package kyc

import (
	"math/rand"

	"github.com/cosmos/cosmos-sdk/baseapp"
	simappparams "github.com/cosmos/cosmos-sdk/simapp/params"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/module"
	simtypes "github.com/cosmos/cosmos-sdk/types/simulation"
	"github.com/cosmos/cosmos-sdk/x/simulation"
	"github.com/st-chain/rollapp/testutil/sample"
	kycsimulation "github.com/st-chain/rollapp/x/kyc/simulation"
	"github.com/st-chain/rollapp/x/kyc/types"
)

// avoid unused import issue
var (
	_ = sample.AccAddress
	_ = kycsimulation.FindAccount
	_ = simappparams.StakePerAccount
	_ = simulation.MsgEntryKind
	_ = baseapp.Paramspace
)

const (
	opWeightMsgUpdateDID = "op_weight_msg_update_did"
	// TODO: Determine the simulation weight value
	defaultWeightMsgUpdateDID int = 100

	opWeightMsgUpdateCredential = "op_weight_msg_update_credential"
	// TODO: Determine the simulation weight value
	defaultWeightMsgUpdateCredential int = 100

	opWeightMsgUpdateKycInfo = "op_weight_msg_update_kyc_info"
	// TODO: Determine the simulation weight value
	defaultWeightMsgUpdateKycInfo int = 100

	// this line is used by starport scaffolding # simapp/module/const
)

// GenerateGenesisState creates a randomized GenState of the module
func (AppModule) GenerateGenesisState(simState *module.SimulationState) {
	accs := make([]string, len(simState.Accounts))
	for i, acc := range simState.Accounts {
		accs[i] = acc.Address.String()
	}
	kycGenesis := types.GenesisState{
		Params: types.DefaultParams(),
		PortId: types.PortID,
		// this line is used by starport scaffolding # simapp/module/genesisState
	}
	simState.GenState[types.ModuleName] = simState.Cdc.MustMarshalJSON(&kycGenesis)
}

// ProposalContents doesn't return any content functions for governance proposals
func (AppModule) ProposalContents(_ module.SimulationState) []simtypes.WeightedProposalContent {
	return nil
}

// RandomizedParams creates randomized  param changes for the simulator
func (am AppModule) RandomizedParams(_ *rand.Rand) []simtypes.ParamChange {

	return []simtypes.ParamChange{}
}

// RegisterStoreDecoder registers a decoder
func (am AppModule) RegisterStoreDecoder(_ sdk.StoreDecoderRegistry) {}

// WeightedOperations returns the all the gov module operations with their respective weights.
func (am AppModule) WeightedOperations(simState module.SimulationState) []simtypes.WeightedOperation {
	operations := make([]simtypes.WeightedOperation, 0)

	var weightMsgUpdateDID int
	simState.AppParams.GetOrGenerate(simState.Cdc, opWeightMsgUpdateDID, &weightMsgUpdateDID, nil,
		func(_ *rand.Rand) {
			weightMsgUpdateDID = defaultWeightMsgUpdateDID
		},
	)
	operations = append(operations, simulation.NewWeightedOperation(
		weightMsgUpdateDID,
		kycsimulation.SimulateMsgUpdateDID(am.accountKeeper, am.bankKeeper, am.keeper),
	))

	var weightMsgUpdateCredential int
	simState.AppParams.GetOrGenerate(simState.Cdc, opWeightMsgUpdateCredential, &weightMsgUpdateCredential, nil,
		func(_ *rand.Rand) {
			weightMsgUpdateCredential = defaultWeightMsgUpdateCredential
		},
	)
	operations = append(operations, simulation.NewWeightedOperation(
		weightMsgUpdateCredential,
		kycsimulation.SimulateMsgUpdateCredential(am.accountKeeper, am.bankKeeper, am.keeper),
	))

	var weightMsgUpdateKycInfo int
	simState.AppParams.GetOrGenerate(simState.Cdc, opWeightMsgUpdateKycInfo, &weightMsgUpdateKycInfo, nil,
		func(_ *rand.Rand) {
			weightMsgUpdateKycInfo = defaultWeightMsgUpdateKycInfo
		},
	)
	operations = append(operations, simulation.NewWeightedOperation(
		weightMsgUpdateKycInfo,
		kycsimulation.SimulateMsgUpdateKycInfo(am.accountKeeper, am.bankKeeper, am.keeper),
	))

	// this line is used by starport scaffolding # simapp/module/operation

	return operations
}
