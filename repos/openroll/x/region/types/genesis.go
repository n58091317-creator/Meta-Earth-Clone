package types

import (
	"fmt"
)

// DefaultGenesis returns the default genesis state
func DefaultGenesis() *GenesisState {
	return &GenesisState{
		Params:           DefaultParams(),
		RegionList:       []Region{},
		RelayerList:      []Relayer{},
		FeeCollectorList: []FeeCollector{},
		DevOperator:      nil,
	}
}

// Validate performs basic genesis state validation returning an error upon any failure.
func (gs GenesisState) Validate() error {
	// Check for duplicated index in region
	regionIndexMap := make(map[string]struct{})
	for _, elem := range gs.RegionList {
		index := string(RegionKey(elem.RegionId))
		if _, ok := regionIndexMap[index]; ok {
			return fmt.Errorf("duplicated index for region")
		}
		regionIndexMap[index] = struct{}{}
	}

	// Check for duplicated index in relayer
	relayerIndexMap := make(map[string]struct{})
	for _, elem := range gs.RelayerList {
		index := string(RelayerKey(elem.Address))
		if _, ok := relayerIndexMap[index]; ok {
			return fmt.Errorf("duplicated index for relayer")
		}
		relayerIndexMap[index] = struct{}{}
	}

	// Check for duplicated index in fee collector
	feeCollectorIndexMap := make(map[string]struct{})
	for _, elem := range gs.FeeCollectorList {
		index := string(FeeCollectorKey(elem.Index))
		if _, ok := feeCollectorIndexMap[index]; ok {
			return fmt.Errorf("duplicated index for feeCollector")
		}
		feeCollectorIndexMap[index] = struct{}{}
	}

	return gs.Params.Validate()
}
