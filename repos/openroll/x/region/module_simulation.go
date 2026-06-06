package region

import (
	"math/rand"

	"github.com/cosmos/cosmos-sdk/baseapp"
	simappparams "github.com/cosmos/cosmos-sdk/simapp/params"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/module"
	simtypes "github.com/cosmos/cosmos-sdk/types/simulation"
	"github.com/cosmos/cosmos-sdk/x/simulation"
	"github.com/st-chain/rollapp/testutil/sample"
	regionsimulation "github.com/st-chain/rollapp/x/region/simulation"
	"github.com/st-chain/rollapp/x/region/types"
)

// avoid unused import issue
var (
	_ = sample.AccAddress
	_ = regionsimulation.FindAccount
	_ = simappparams.StakePerAccount
	_ = simulation.MsgEntryKind
	_ = baseapp.Paramspace
)

const (
	opWeightMsgCreateRegion = "op_weight_msg_region"
	// TODO: Determine the simulation weight value
	defaultWeightMsgCreateRegion int = 100

	opWeightMsgUpdateRegion = "op_weight_msg_region"
	// TODO: Determine the simulation weight value
	defaultWeightMsgUpdateRegion int = 100

	opWeightMsgDeleteRegion = "op_weight_msg_region"
	// TODO: Determine the simulation weight value
	defaultWeightMsgDeleteRegion int = 100

	opWeightMsgRemoveRegion = "op_weight_msg_remove_region"
	// TODO: Determine the simulation weight value
	defaultWeightMsgRemoveRegion int = 100

	// MsgUpdateDao removed

	opWeightMsgCreateRelayer = "op_weight_msg_relayer"
	// TODO: Determine the simulation weight value
	defaultWeightMsgCreateRelayer int = 100

	opWeightMsgUpdateRelayer = "op_weight_msg_relayer"
	// TODO: Determine the simulation weight value
	defaultWeightMsgUpdateRelayer int = 100

	opWeightMsgDeleteRelayer = "op_weight_msg_relayer"
	// TODO: Determine the simulation weight value
	defaultWeightMsgDeleteRelayer int = 100

	// this line is used by starport scaffolding # simapp/module/const
)

// GenerateGenesisState creates a randomized GenState of the module
func (AppModule) GenerateGenesisState(simState *module.SimulationState) {
	accs := make([]string, len(simState.Accounts))
	for i, acc := range simState.Accounts {
		accs[i] = acc.Address.String()
	}
	regionGenesis := types.GenesisState{
		Params: types.DefaultParams(),
		RegionList: []types.Region{
			{
				OperatorAddress:    sample.AccAddress(),
				RegionId:           "0",
				RegionTreasureAddr: sample.AccAddress(),
			},
			{
				OperatorAddress:    sample.AccAddress(),
				RegionId:           "1",
				RegionTreasureAddr: sample.AccAddress(),
			},
		},
		RelayerList: []types.Relayer{
			{
				Creator: sample.AccAddress(),
				Address: "0",
			},
			{
				Creator: sample.AccAddress(),
				Address: "1",
			},
		},
		// this line is used by starport scaffolding # simapp/module/genesisState
	}
	simState.GenState[types.ModuleName] = simState.Cdc.MustMarshalJSON(&regionGenesis)
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

	var weightMsgCreateRegion int
	simState.AppParams.GetOrGenerate(simState.Cdc, opWeightMsgCreateRegion, &weightMsgCreateRegion, nil,
		func(_ *rand.Rand) {
			weightMsgCreateRegion = defaultWeightMsgCreateRegion
		},
	)

	var weightMsgUpdateRegion int
	simState.AppParams.GetOrGenerate(simState.Cdc, opWeightMsgUpdateRegion, &weightMsgUpdateRegion, nil,
		func(_ *rand.Rand) {
			weightMsgUpdateRegion = defaultWeightMsgUpdateRegion
		},
	)
	operations = append(operations, simulation.NewWeightedOperation(
		weightMsgUpdateRegion,
		regionsimulation.SimulateMsgUpdateRegion(am.accountKeeper, am.bankKeeper, am.keeper),
	))

	var weightMsgDeleteRegion int
	simState.AppParams.GetOrGenerate(simState.Cdc, opWeightMsgDeleteRegion, &weightMsgDeleteRegion, nil,
		func(_ *rand.Rand) {
			weightMsgDeleteRegion = defaultWeightMsgDeleteRegion
		},
	)

	var weightMsgRemoveRegion int
	simState.AppParams.GetOrGenerate(simState.Cdc, opWeightMsgRemoveRegion, &weightMsgRemoveRegion, nil,
		func(_ *rand.Rand) {
			weightMsgRemoveRegion = defaultWeightMsgRemoveRegion
		},
	)
	operations = append(operations, simulation.NewWeightedOperation(
		weightMsgRemoveRegion,
		regionsimulation.SimulateMsgRemoveRegion(am.accountKeeper, am.bankKeeper, am.keeper),
	))

	// MsgUpdateDao simulation removed

	var weightMsgCreateRelayer int
	simState.AppParams.GetOrGenerate(simState.Cdc, opWeightMsgCreateRelayer, &weightMsgCreateRelayer, nil,
		func(_ *rand.Rand) {
			weightMsgCreateRelayer = defaultWeightMsgCreateRelayer
		},
	)
	operations = append(operations, simulation.NewWeightedOperation(
		weightMsgCreateRelayer,
		regionsimulation.SimulateMsgCreateRelayer(am.accountKeeper, am.bankKeeper, am.keeper),
	))

	var weightMsgUpdateRelayer int
	simState.AppParams.GetOrGenerate(simState.Cdc, opWeightMsgUpdateRelayer, &weightMsgUpdateRelayer, nil,
		func(_ *rand.Rand) {
			weightMsgUpdateRelayer = defaultWeightMsgUpdateRelayer
		},
	)
	operations = append(operations, simulation.NewWeightedOperation(
		weightMsgUpdateRelayer,
		regionsimulation.SimulateMsgUpdateRelayer(am.accountKeeper, am.bankKeeper, am.keeper),
	))

	var weightMsgDeleteRelayer int
	simState.AppParams.GetOrGenerate(simState.Cdc, opWeightMsgDeleteRelayer, &weightMsgDeleteRelayer, nil,
		func(_ *rand.Rand) {
			weightMsgDeleteRelayer = defaultWeightMsgDeleteRelayer
		},
	)
	operations = append(operations, simulation.NewWeightedOperation(
		weightMsgDeleteRelayer,
		regionsimulation.SimulateMsgDeleteRelayer(am.accountKeeper, am.bankKeeper, am.keeper),
	))

	// this line is used by starport scaffolding # simapp/module/operation

	return operations
}
