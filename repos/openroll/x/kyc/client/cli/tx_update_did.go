package cli

import (
	"strconv"

	"encoding/hex"
	"encoding/json"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/cosmos/cosmos-sdk/client/tx"
	"github.com/spf13/cast"
	"github.com/spf13/cobra"
	"github.com/st-chain/rollapp/x/kyc/types"
)

var _ = strconv.Itoa(0)

func CmdUpdateDID() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "update-did <proof-height> <did-items> <storeHash> <store-proof> <proofs>",
		Short: "Broadcast message update_DID",
		Args:  cobra.ExactArgs(5),
		RunE: func(cmd *cobra.Command, args []string) (err error) {
			argProofHeight, err := cast.ToUint64E(args[0])
			if err != nil {
				return err
			}
			items := make([]*types.Item, 0)
			err = json.Unmarshal([]byte(args[1]), &items)
			if err != nil {
				return err
			}
			storeHash, err := hex.DecodeString(args[2])
			if err != nil {
				return err
			}
			storeProof, err := hex.DecodeString(args[3])
			if err != nil {
				return err
			}
			proofs, err := hex.DecodeString(args[4])
			if err != nil {
				return err
			}

			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

			msg := types.NewMsgUpdateDID(
				clientCtx.GetFromAddress().String(),
				argProofHeight,
				items,
				proofs,
				storeProof,
				storeHash,
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
