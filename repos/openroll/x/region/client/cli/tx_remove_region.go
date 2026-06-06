package cli

import (
	"encoding/hex"
	"encoding/json"
	"strconv"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/cosmos/cosmos-sdk/client/tx"
	"github.com/spf13/cobra"
	"github.com/st-chain/rollapp/x/region/types"
)

var _ = strconv.Itoa(0)

func CmdRemoveRegion() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "remove-region [proof-height] [store-hash] [store-proof] [proofs] [regions]",
		Short: "Broadcast message RemoveRegion",
		Args:  cobra.ExactArgs(5),
		RunE: func(cmd *cobra.Command, args []string) (err error) {
			argProofHeight, err := strconv.ParseUint(args[0], 10, 64)
			if err != nil {
				return err
			}
			argStoreHash, err := hex.DecodeString(args[1])
			if err != nil {
				return err
			}
			argStoreProof, err := hex.DecodeString(args[2])
			if err != nil {
				return err
			}
			argProofs, err := hex.DecodeString(args[3])
			if err != nil {
				return err
			}
			argRegions := []*types.Item{}
			err = json.Unmarshal([]byte(args[4]), &argRegions)
			if err != nil {
				return err
			}
			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

			msg := types.NewMsgRemoveRegion(
				clientCtx.GetFromAddress().String(),
				argProofHeight,
				argStoreHash,
				argStoreProof,
				argProofs,
				argRegions,
			)
			if err := msg.ValidateBasic(); err != nil {
				return err
			}
			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)

	return cmd
}
