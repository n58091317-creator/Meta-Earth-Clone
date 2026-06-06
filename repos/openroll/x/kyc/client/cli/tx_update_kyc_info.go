package cli

import (
	"encoding/hex"
	"encoding/json"
	"strconv"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/cosmos/cosmos-sdk/client/tx"
	"github.com/spf13/cast"
	"github.com/spf13/cobra"
	"github.com/st-chain/rollapp/x/kyc/types"
)

var _ = strconv.Itoa(0)

func CmdUpdateKycInfo() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "update-kyc-info <proof-height> <store-hash> <store-proof> <proofs> <did-infos>",
		Short: "Broadcast message UpdateKycInfo",
		Args:  cobra.ExactArgs(5),
		RunE: func(cmd *cobra.Command, args []string) (err error) {
			argProofHeight, err := cast.ToUint64E(args[0])
			if err != nil {
				return err
			}
			storeHash, err := hex.DecodeString(args[1])
			if err != nil {
				return err
			}
			storeProof, err := hex.DecodeString(args[2])
			if err != nil {
				return err
			}
			proofs, err := hex.DecodeString(args[3])
			if err != nil {
				return err
			}
			didInfos := make([]*types.Item, 0)
			err = json.Unmarshal([]byte(args[4]), &didInfos)
			if err != nil {
				return err
			}

			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

			msg := types.NewMsgUpdateKycInfo(
				clientCtx.GetFromAddress().String(),
				argProofHeight,
				storeHash,
				storeProof,
				proofs,
				didInfos,
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
