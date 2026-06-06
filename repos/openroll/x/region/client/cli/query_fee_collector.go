package cli

import (
	"context"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/spf13/cobra"
	"github.com/st-chain/rollapp/x/region/types"
)

func CmdListFeeCollector() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list-fee-collector",
		Short: "list all fee_collector",
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx := client.GetClientContextFromCmd(cmd)

			pageReq, err := client.ReadPageRequest(cmd.Flags())
			if err != nil {
				return err
			}

			queryClient := types.NewQueryClient(clientCtx)

			params := &types.QueryAllFeeCollectorRequest{
				Pagination: pageReq,
			}

			res, err := queryClient.FeeCollectorAll(context.Background(), params)
			if err != nil {
				return err
			}

			return clientCtx.PrintProto(res)
		},
	}

	flags.AddPaginationFlagsToCmd(cmd, cmd.Use)
	flags.AddQueryFlagsToCmd(cmd)

	return cmd
}

func CmdShowFeeCollector() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "show-fee-collector [operator_address]",
		Short: "shows a fee_collector",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) (err error) {
			clientCtx := client.GetClientContextFromCmd(cmd)

			queryClient := types.NewQueryClient(clientCtx)

			Index := args[0]

			params := &types.QueryGetFeeCollectorRequest{
				Index: Index,
			}

			res, err := queryClient.FeeCollector(context.Background(), params)
			if err != nil {
				return err
			}

			return clientCtx.PrintProto(res)
		},
	}

	flags.AddQueryFlagsToCmd(cmd)

	return cmd
}
