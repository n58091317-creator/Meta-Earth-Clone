package kyc_test

import (
	"testing"

	keepertest "github.com/st-chain/rollapp/testutil/keeper"
	"github.com/st-chain/rollapp/testutil/nullify"
	"github.com/st-chain/rollapp/x/kyc"
	"github.com/st-chain/rollapp/x/kyc/types"
	"github.com/stretchr/testify/require"
)

func TestGenesis(t *testing.T) {
	genesisState := types.GenesisState{
		Params: types.DefaultParams(),
		PortId: types.PortID,
		KYCCredentialList: []types.KYCCredential{
			{
				Did: "0",
			},
			{
				Did: "1",
			},
		},
		DidList: []types.Did{
			{
				Address: "0",
			},
			{
				Address: "1",
			},
		},
		DidInfoList: []types.DidInfo{
			{
				Did: "0",
			},
			{
				Did: "1",
			},
		},
		// this line is used by starport scaffolding # genesis/test/state
	}

	k, ctx := keepertest.KycKeeper(t)
	kyc.InitGenesis(ctx, *k, genesisState)
	got := kyc.ExportGenesis(ctx, *k)
	require.NotNil(t, got)

	nullify.Fill(&genesisState)
	nullify.Fill(got)

	require.Equal(t, genesisState.PortId, got.PortId)

	require.ElementsMatch(t, genesisState.KYCCredentialList, got.KYCCredentialList)
	require.ElementsMatch(t, genesisState.DidList, got.DidList)
	require.ElementsMatch(t, genesisState.DidInfoList, got.DidInfoList)
	// this line is used by starport scaffolding # genesis/test/assert
}
