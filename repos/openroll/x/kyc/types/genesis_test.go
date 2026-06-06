package types_test

import (
	"testing"

	"github.com/st-chain/rollapp/x/kyc/types"
	"github.com/stretchr/testify/require"
)

func TestGenesisState_Validate(t *testing.T) {
	for _, tc := range []struct {
		desc     string
		genState *types.GenesisState
		valid    bool
	}{
		{
			desc:     "default is valid",
			genState: types.DefaultGenesis(),
			valid:    true,
		},
		{
			desc: "valid genesis state",
			genState: &types.GenesisState{
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
				// this line is used by starport scaffolding # types/genesis/validField
			},
			valid: true,
		},
		{
			desc: "duplicated kYCCredential",
			genState: &types.GenesisState{
				KYCCredentialList: []types.KYCCredential{
					{
						Did: "0",
					},
					{
						Did: "0",
					},
				},
			},
			valid: false,
		},
		{
			desc: "duplicated did",
			genState: &types.GenesisState{
				DidList: []types.Did{
					{
						Address: "0",
					},
					{
						Address: "0",
					},
				},
			},
			valid: false,
		},
		{
			desc: "duplicated didInfo",
			genState: &types.GenesisState{
				DidInfoList: []types.DidInfo{
					{
						Did: "0",
					},
					{
						Did: "0",
					},
				},
			},
			valid: false,
		},
		// this line is used by starport scaffolding # types/genesis/testcase
	} {
		t.Run(tc.desc, func(t *testing.T) {
			err := tc.genState.Validate()
			if tc.valid {
				require.NoError(t, err)
			} else {
				require.Error(t, err)
			}
		})
	}
}
