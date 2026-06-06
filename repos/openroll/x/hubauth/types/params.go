package types

import (
	"fmt"

	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"
	"gopkg.in/yaml.v2"
)

var _ paramtypes.ParamSet = (*Params)(nil)

var (
	KeyClientId  = []byte("ClientId")
	KeyDenomPath = []byte("DenomPath")

	DefaultClientId string = "07-tendermint-0"
)

// ParamKeyTable the param key table for launch module
func ParamKeyTable() paramtypes.KeyTable {
	return paramtypes.NewKeyTable().RegisterParamSet(&Params{})
}

// NewParams creates a new Params instance
func NewParams(
	clientId string,
) Params {
	return Params{
		ClientId: clientId,
	}
}

// DefaultParams returns a default set of parameters
func DefaultParams() Params {
	return NewParams(
		DefaultClientId,
	)
}

// ParamSetPairs get the params.ParamSet
func (p *Params) ParamSetPairs() paramtypes.ParamSetPairs {
	return paramtypes.ParamSetPairs{
		paramtypes.NewParamSetPair(KeyClientId, &p.ClientId, validateClientId),
		paramtypes.NewParamSetPair(KeyDenomPath, &p.DenomPath, validateDenomPath),
	}
}

// Validate validates the set of params
func (p Params) Validate() error {
	if err := validateClientId(p.ClientId); err != nil {
		return err
	}
	if err := validateDenomPath(p.ClientId); err != nil {
		return err
	}
	return nil
}

// String implements the Stringer interface.
func (p Params) String() string {
	out, _ := yaml.Marshal(p)
	return string(out)
}

// validateClientId validates the ClientId param
func validateClientId(v interface{}) error {
	clientId, ok := v.(string)
	if !ok {
		return fmt.Errorf("invalid parameter type: %T", v)
	}
	_ = clientId
	return nil
}

// validateClientId validates the ClientId param
func validateDenomPath(v interface{}) error {
	path, ok := v.(string)
	if !ok {
		return fmt.Errorf("invalid parameter type: %T", v)
	}
	_ = path
	return nil
}
