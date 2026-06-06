package layer1

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	dymintconf "github.com/st-chain/dymint/config"
	"github.com/st-chain/rollapp/sync/hubclient"
	"github.com/st-chain/rollapp/sync/rollapp_grpc"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	FlagHubGrpcNode     = "hub-grpc"
	FlagHubRpcNode      = "hub-rpc"
	FlagRollappRpcNode  = "rollapp-rpc"
	FlagRollappGrpcNode = "rollapp-grpc"
)

func CmdSyncIndepently() *cobra.Command {
	cmd := &cobra.Command{
		Use:     "sync-kyc [update]",
		Short:   "sync kyc",
		Example: `rollappd sync-kyc`,
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) (err error) {
			update := strings.ToLower(args[0]) == "true"

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
			if viper.GetString(FlagHubRpcNode) != "" {
				dymconfig.SettlementConfig.NodeAddress = viper.GetString(FlagHubRpcNode)
			}
			if viper.GetString(FlagRollappRpcNode) != "" {
				rclient, err := client.NewClientFromNode(viper.GetString(FlagRollappRpcNode))
				if err != nil {
					return err
				}
				clientCtx = clientCtx.WithClient(rclient)
			}
			if clientCtx.FromName == "" {
				clientCtx.FromName = clientCtx.Viper.GetString("sync-hub-key-name")
			}
			keyAddress := clientCtx.Viper.GetString("sync-hub-key-address")

			helper, err := NewUpdateHelper(dymconfig, clientCtx.Codec, clientCtx, keyAddress)
			if err != nil {
				return err
			}

			hubGrpcCli, err := hubclient.NewClient(context.Background(), viper.GetString(FlagHubGrpcNode))
			if err != nil {
				return fmt.Errorf("grpc sync from hub, new client: %w", err)
			}

			rollappGrpcCli, err := rollapp_grpc.NewClient(context.Background(), viper.GetString(FlagRollappGrpcNode))
			if err != nil {
				return fmt.Errorf("grpc sync from hub, new client: %w", err)
			}

			ticker := time.NewTicker(time.Minute * 1)

			for {
				select {
				case <-ticker.C:
					unSyncAddress, unSyncDid, err := GetUnsyncedAddresses(hubGrpcCli, rollappGrpcCli)
					if err != nil {
						return err
					}

					if len(unSyncAddress) > 0 {
						writeToFile(unSyncAddress, "unsync_addresses.json")
					}

					if update {
						batchSize := 200
						for i := 0; i < len(unSyncAddress); i += batchSize {
							end := i + batchSize
							if end > len(unSyncAddress) {
								end = len(unSyncAddress)
							}
							batch := unSyncAddress[i:end]
							dids := unSyncDid[i:end]
							if err = CreateUpdateDidMsgs(cmd.Context(), helper, batch, dids); err != nil {
								fmt.Println("create update did msgs error: ", err)
								time.Sleep(time.Second)
								i -= batchSize
								if i < 0 {
									i = 0
								}
								continue
							}
						}
					}
					ticker.Reset(time.Minute * 30)
				}
			}
		},
	}
	flags.AddTxFlagsToCmd(cmd)
	cmd.PersistentFlags().String(FlagHubGrpcNode, "", "grpc")
	cmd.PersistentFlags().String(FlagHubRpcNode, "", "rpc")
	cmd.PersistentFlags().String(FlagRollappGrpcNode, "", "rollapp grpc")
	cmd.PersistentFlags().String(FlagRollappRpcNode, "", "rollapp rpc")
	return cmd
}

func writeToFile(chunk []string, fileName string) error {
	// Marshal the chunk to JSON
	data, err := json.MarshalIndent(chunk, "", "    ")
	if err != nil {
		return fmt.Errorf("failed to marshal chunk: %w", err)
	}

	// Write the JSON data to the file
	if err := os.WriteFile(fileName, data, 0644); err != nil {
		return fmt.Errorf("failed to write file %s: %w", fileName, err)
	}

	fmt.Printf("Chunk written to %s\n", fileName)
	return nil
}
