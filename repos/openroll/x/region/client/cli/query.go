package cli

import (
	"fmt"
	// "strings"

	"github.com/spf13/cobra"

	"github.com/cosmos/cosmos-sdk/client"
	// "github.com/cosmos/cosmos-sdk/client/flags"
	// sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/st-chain/rollapp/x/region/types"
)

// GetQueryCmd returns the cli query commands for this module
func GetQueryCmd(queryRoute string) *cobra.Command {
	// Group region queries under a subcommand
	cmd := &cobra.Command{
		Use:                        types.ModuleName,
		Short:                      fmt.Sprintf("Querying commands for the %s module", types.ModuleName),
		DisableFlagParsing:         true,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}

	cmd.AddCommand(CmdQueryParams())
	cmd.AddCommand(CmdListRegion())
	cmd.AddCommand(CmdShowRegion())
	cmd.AddCommand(CmdListRelayer())
	cmd.AddCommand(CmdShowRelayer())
	cmd.AddCommand(CmdListFeeCollector())
	cmd.AddCommand(CmdShowFeeCollector())
	cmd.AddCommand(CmdShowDevOperator())
	// this line is used by starport scaffolding # 1

	return cmd
}
