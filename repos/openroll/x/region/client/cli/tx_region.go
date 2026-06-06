package cli

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/cosmos/cosmos-sdk/client/tx"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	dymintconf "github.com/st-chain/dymint/config"
	"github.com/st-chain/rollapp/sync/layer1"
	"github.com/st-chain/rollapp/x/region/types"
)

func CmdUpdateRegion() *cobra.Command {
	cmd := &cobra.Command{
		Use:     "update-region [proof-height] [store-hash] [store-proof] [proofs] [regions]",
		Short:   "Update a region",
		Example: `rollappd tx region update-region [proof-height] [store-hash-hex-encode] [store-proof-hex-encode] [proofs-hex-encode] [{Key:"key", Value: "value"}]`,
		Args:    cobra.ExactArgs(5),
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

			msg := types.NewMsgUpdateRegion(
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

func CmdSyncRegionComposed() *cobra.Command {
	cmd := &cobra.Command{
		Use:     "sync <region_id...>",
		Short:   "sync some region",
		Example: `rollappd tx region sync me_earth,usd,rus --relayer-addr mexxxxxxxx`,
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) (err error) {
			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

			dymconfig := dymintconf.DefaultConfig("", "")
			dymintconf.EnsureRoot(clientCtx.HomeDir, nil)
			v := viper.GetViper()
			v.AddConfigPath(filepath.Join(clientCtx.HomeDir, "config"))
			v.SetConfigName("dymint")
			err = v.ReadInConfig()
			if err != nil {
				return err
			}
			err = viper.Unmarshal(&dymconfig)
			if err != nil {
				return err
			}
			if clientCtx.FromName == "" {
				clientCtx.FromName = clientCtx.Viper.GetString("sync-hub-key-name")
			}
			relayerAddr := cmd.Flags().Lookup("relayer-addr").Value.String()
			if relayerAddr == "" {
				return fmt.Errorf("relayer address is required")
			}
			helper, err := layer1.NewUpdateHelper(dymconfig, clientCtx.Codec, clientCtx, relayerAddr)
			if err != nil {
				return err
			}
			regionIDs := strings.Split(args[0], ",")
			keys := make([][]byte, len(regionIDs))
			for i, regionID := range regionIDs {
				keys[i] = append(types.MeHubRegionPrefix, []byte(regionID+"/")...)
			}

			msgConstructor := func(signer string, proofHeight uint64, items []*types.Item, proofs, storeProof, storeRoot []byte) *types.MsgUpdateRegion {
				msg := types.NewMsgUpdateRegion(
					signer,
					proofHeight,
					storeRoot,
					storeProof,
					proofs,
					items,
				)
				if err := msg.ValidateBasic(); err != nil {
					panic(err)
				}
				return msg
			}
			msgs, err := layer1.MakeUpdateMsgCompose(cmd.Context(), helper, keys, "staking", 0, msgConstructor)
			if err != nil {
				return err
			}
			for _, msg := range msgs {
				err := msg.ValidateBasic()
				if err != nil {
					return err
				}
			}
			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msgs...)
		},
	}
	cmd.Flags().String("relayer-addr", "", "relayer address")
	flags.AddTxFlagsToCmd(cmd)
	return cmd
}

func CmdSyncWithRemoveRegionComposed() *cobra.Command {
	cmd := &cobra.Command{
		Use:     "sync-rm <region_id...>",
		Short:   "sync-rm some region has been removed",
		Example: `rollappd tx region sync-rm me_earth,usd,rus --relayer-addr mexxxxxxxx`,
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) (err error) {
			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

			dymconfig := dymintconf.DefaultConfig("", "")
			dymintconf.EnsureRoot(clientCtx.HomeDir, nil)
			v := viper.GetViper()
			v.AddConfigPath(filepath.Join(clientCtx.HomeDir, "config"))
			v.SetConfigName("dymint")
			err = v.ReadInConfig()
			if err != nil {
				return err
			}
			err = viper.Unmarshal(&dymconfig)
			if err != nil {
				return err
			}
			if clientCtx.FromName == "" {
				clientCtx.FromName = clientCtx.Viper.GetString("sync-hub-key-name")
			}
			relayerAddr := cmd.Flags().Lookup("relayer-addr").Value.String()
			if relayerAddr == "" {
				return fmt.Errorf("relayer address is required")
			}
			helper, err := layer1.NewUpdateHelper(dymconfig, clientCtx.Codec, clientCtx, relayerAddr)
			if err != nil {
				return err
			}
			regionIDs := strings.Split(args[0], ",")
			keys := make([][]byte, len(regionIDs))
			for i, regionID := range regionIDs {
				keys[i] = append(types.MeHubRegionPrefix, []byte(regionID+"/")...)
			}

			msgConstructor := func(signer string, proofHeight uint64, items []*types.Item, proofs, storeProof, storeRoot []byte) *types.MsgRemoveRegion {
				msg := types.NewMsgRemoveRegion(
					signer,
					proofHeight,
					storeRoot,
					storeProof,
					proofs,
					items,
				)
				if err := msg.ValidateBasic(); err != nil {
					panic(err)
				}
				return msg
			}
			msgs, err := layer1.MakeUpdateMsgCompose(cmd.Context(), helper, keys, "staking", 0, msgConstructor)
			if err != nil {
				return err
			}
			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msgs...)
		},
	}
	cmd.Flags().String("relayer-addr", "", "relayer address")
	flags.AddTxFlagsToCmd(cmd)

	return cmd
}
