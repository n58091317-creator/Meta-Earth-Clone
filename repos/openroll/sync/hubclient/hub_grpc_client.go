package hubclient

import (
	"context"
	"fmt"
	"github.com/cosmos/cosmos-sdk/client/grpc/tmservice"
	"github.com/cosmos/cosmos-sdk/types/query"
	"github.com/cosmos/cosmos-sdk/types/tx"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"
	kyctypes "github.com/st-chain/rollapp/sync/hubclient/types"
	"google.golang.org/grpc"
	"google.golang.org/grpc/backoff"
	"time"
)

type Client struct {
	tmClient   tmservice.ServiceClient
	txClient   tx.ServiceClient
	authClient authtypes.QueryClient
	bankClient banktypes.QueryClient
	ctx        context.Context
	kycClient  kyctypes.QueryClient
}

func NewClient(ctx context.Context, rawUrl string) (*Client, error) {
	maxMsgSize := 100 * 1024 * 1024
	opts := []grpc.DialOption{
		grpc.WithConnectParams(grpc.ConnectParams{
			Backoff: backoff.Config{
				BaseDelay:  1.0 * time.Second, // Initial delay
				Multiplier: 1.6,               // Multiplier for each retry
				MaxDelay:   30 * time.Second,  // Maximum delay
			},
			MinConnectTimeout: 10 * time.Second,
		}),
		grpc.WithInsecure(),
		grpc.WithDefaultCallOptions(
			grpc.MaxCallRecvMsgSize(maxMsgSize),
			grpc.MaxCallSendMsgSize(maxMsgSize),
		),
	}

	grpcDial, err := grpc.NewClient(rawUrl, opts...)
	if err != nil {
		return nil, err
	}

	client := &Client{
		tmClient:   tmservice.NewServiceClient(grpcDial),
		txClient:   tx.NewServiceClient(grpcDial),
		authClient: authtypes.NewQueryClient(grpcDial),
		bankClient: banktypes.NewQueryClient(grpcDial),
		ctx:        context.Background(),
		kycClient:  kyctypes.NewQueryClient(grpcDial),
	}

	_, err = client.tmClient.GetLatestBlock(client.ctx, &tmservice.GetLatestBlockRequest{})
	if err != nil {
		return nil, err
	}
	return client, nil
}

func (cli *Client) GetAllDidInfos() ([]kyctypes.DidInfo, map[string]int, error) {
	var getAccount func([]kyctypes.DidInfo, []byte) ([]kyctypes.DidInfo, error)
	nextKeyCache := []byte{}
	accountExist := make(map[string]bool)
	didInfos := []kyctypes.DidInfo{}
	regionCount := make(map[string]int)
	retries := 0
	getAccount = func(accounts []kyctypes.DidInfo, nextKey []byte) ([]kyctypes.DidInfo, error) {
		response, err := cli.kycClient.DidInfos(context.Background(), &kyctypes.QueryDidInfos{
			Pagination: &query.PageRequest{
				Limit: 200,
				Key:   nextKey,
			}})
		if err != nil {
			fmt.Println("grpc sync kyc", "error", err)
			if retries < 10 {
				retries++
				time.Sleep(time.Second)
				return getAccount(accounts, nextKeyCache)
			}
			return accounts, err
		}
		for _, m := range response.GetInfos() {
			if _, ok := accountExist[m.Address]; ok {
				continue
			}

			regionCount[m.RegionId]++

			accounts = append(accounts, m)
			accountExist[m.Address] = true
		}
		if len(accounts)%100000 == 0 {
			fmt.Println("grpc sync kyc", "length", len(accounts))
		}
		if response != nil && response.Pagination != nil {
			if len(response.Pagination.NextKey) > 0 {
				nextKeyCache = response.Pagination.NextKey
				return getAccount(accounts, response.Pagination.NextKey)
			}
		}
		return accounts, nil
	}

	results, err := getAccount(didInfos, nil)
	return results, regionCount, err
}
