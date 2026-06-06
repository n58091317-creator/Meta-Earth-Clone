package cli

import (
	"context"
	"fmt"
	"strconv"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	goLog "github.com/ipfs/go-log/v2"
	"github.com/spf13/cobra"
	dymintconf "github.com/st-chain/dymint/config"
	"github.com/st-chain/rollapp/logger"
	"github.com/st-chain/rollapp/x/kyc/types"
	rpchttp "github.com/tendermint/tendermint/rpc/client/http"
	"google.golang.org/grpc"
)

var _ = strconv.Itoa(0)

func CmdMeKycs() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "me-kycs [regionid]",
		Short: "Query me-kycs",
		RunE: func(cmd *cobra.Command, args []string) (err error) {
			//reqRegionid := ""
			//if len(args) != 0 {
			//	reqRegionid = args[0]
			//}

			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			queryClient, err := NewQueryMehubKYCs(cmd, &clientCtx)
			if err != nil {
				return err
			}
			params := &types.QueryMeKycsRequest{

				//Regionid: reqRegionid,
			}

			//pageReq, err := client.ReadPageRequest(cmd.Flags())
			//if err != nil {
			//	return err
			//}
			//params.Pagination = pageReq

			res, err := queryClient.MeKycs(cmd.Context(), params)
			if err != nil {
				return err
			}

			return clientCtx.PrintProto(res)
		},
	}

	flags.AddQueryFlagsToCmd(cmd)

	return cmd
}

type QueryMeHubKYCs struct {
	cc *client.Context
}

func NewQueryMehubKYCs(cmd *cobra.Command, client *client.Context) (*QueryMeHubKYCs, error) {
	if nodeAddr, _ := cmd.Flags().GetString("node"); nodeAddr != "" {
		return &QueryMeHubKYCs{cc: client}, nil
	}
	dymconfig := dymintconf.DefaultConfig("", "")
	err := dymconfig.GetViperConfig(cmd, client.Viper.GetString(flags.FlagHome))
	if err != nil {
		return &QueryMeHubKYCs{cc: client}, err
	}
	meHub, err := rpchttp.New(dymconfig.SettlementConfig.NodeAddress, "/websocket")
	if err != nil {
		return nil, fmt.Errorf("init me-hub client failed")
	}
	var log = logger.NewLogger("me-query").WithEnvLevelOr("info").WithStacktrace(goLog.LevelError)
	meHub.Logger = log
	client.Client = meHub
	return &QueryMeHubKYCs{cc: client}, nil
}

func (c *QueryMeHubKYCs) MeKycs(ctx context.Context, in *types.QueryMeKycsRequest, opts ...grpc.CallOption) (*types.QueryMeKycsResponse, error) {
	out := new(types.QueryMeKycsResponse)
	err := c.cc.Invoke(ctx, "/metaearth.kyc.Query/KYCs", in, out, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func CmdDidInfos() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "me-did-infos",
		Short: "Query did_infos on me-hub",
		Args:  cobra.ExactArgs(0),
		RunE: func(cmd *cobra.Command, args []string) (err error) {

			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			queryClient, err := NewQueryMehubKYCs(cmd, &clientCtx)
			if err != nil {
				return err
			}

			params := &types.QueryMeDidInfoRequest{}

			pageReq, err := client.ReadPageRequest(cmd.Flags())
			if err != nil {
				return err
			}
			params.Pagination = pageReq

			res, err := queryClient.DidInfos(cmd.Context(), params)
			if err != nil {
				return err
			}

			return clientCtx.PrintProto(res)
		},
	}

	flags.AddQueryFlagsToCmd(cmd)

	return cmd
}

func (c *QueryMeHubKYCs) DidInfos(ctx context.Context, in *types.QueryMeDidInfoRequest, opts ...grpc.CallOption) (*types.QueryMeDidInfoResponse, error) {
	out := new(types.QueryMeDidInfoResponse)
	err := c.cc.Invoke(ctx, "/metaearth.did.Query/DidInfos", in, out, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}
