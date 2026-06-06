package types

import (
	"fmt"
	host "github.com/cosmos/ibc-go/v6/modules/core/24-host"
)

// DefaultIndex is the default global index
const DefaultIndex uint64 = 1

// DefaultGenesis returns the default genesis state
func DefaultGenesis() *GenesisState {
	return &GenesisState{
		PortId:            PortID,
		KYCCredentialList: []KYCCredential{},
		DidList:           []Did{},
		DidInfoList:       []DidInfo{},
		// this line is used by starport scaffolding # genesis/types/default
		Params: DefaultParams(),
	}
}

// Validate performs basic genesis state validation returning an error upon any
// failure.
func (gs GenesisState) Validate() error {
	if err := host.PortIdentifierValidator(gs.PortId); err != nil {
		return err
	}
	// Check for duplicated index in kYCCredential
	kYCCredentialIndexMap := make(map[string]struct{})

	for _, elem := range gs.KYCCredentialList {
		index := string(KYCCredentialKey(elem.Did))
		if _, ok := kYCCredentialIndexMap[index]; ok {
			return fmt.Errorf("duplicated index for kYCCredential")
		}
		kYCCredentialIndexMap[index] = struct{}{}
	}
	// Check for duplicated index in did
	didIndexMap := make(map[string]struct{})

	for _, elem := range gs.DidList {
		index := string(DidKey(elem.Address))
		if _, ok := didIndexMap[index]; ok {
			return fmt.Errorf("duplicated index for did")
		}
		didIndexMap[index] = struct{}{}
	}
	// Check for duplicated index in didInfo
	didInfoIndexMap := make(map[string]struct{})

	for _, elem := range gs.DidInfoList {
		index := string(DidInfoKey(elem.Did))
		if _, ok := didInfoIndexMap[index]; ok {
			return fmt.Errorf("duplicated index for didInfo")
		}
		didInfoIndexMap[index] = struct{}{}
	}
	// this line is used by starport scaffolding # genesis/types/validate

	return gs.Params.Validate()
}
