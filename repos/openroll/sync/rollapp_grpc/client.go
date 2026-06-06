package rollapp_grpc

import (
	"context"
	kyctypes "github.com/st-chain/rollapp/x/kyc/types"
	"google.golang.org/grpc/backoff"
	"time"

	"github.com/cosmos/cosmos-sdk/client/grpc/tmservice"
	"github.com/cosmos/cosmos-sdk/types/tx"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"
	minttypes "github.com/cosmos/cosmos-sdk/x/mint/types"
	slashingtypes "github.com/cosmos/cosmos-sdk/x/slashing/types"
	stakingtypes "github.com/cosmos/cosmos-sdk/x/staking/types"
	"google.golang.org/grpc"
)

const DefGasLimit = 500000

type Client struct {
	tmClient       tmservice.ServiceClient
	txClient       tx.ServiceClient
	authClient     authtypes.QueryClient
	bankClient     banktypes.QueryClient
	stakingClient  stakingtypes.QueryClient
	slashingClient slashingtypes.QueryClient
	mintClient     minttypes.QueryClient
	ctx            context.Context
	kycClient      kyctypes.QueryClient
}

func NewClient(ctx context.Context, rawUrl string) (*Client, error) {
	//u, err := url.Parse(rawUrl)
	//if err != nil {
	//	return nil, err
	//}
	//_url := u.Host
	//if u.Port() == "" {
	//	if u.Scheme == "http" {
	//		_url = u.Host + ":80"
	//	} else {
	//		_url = u.Host + ":443"
	//	}
	//}

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

	//if u.Scheme == "https" {
	//	//opts = append(opts, grpc.WithCredentialsBundle(google.NewDefaultCredentials()))
	//	creds, err := credentials.NewClientTLSFromFile("path/to/your/certificate.crt", "")
	//	if err != nil {
	//		return nil, err
	//	}
	//	opts = append(opts, grpc.WithTransportCredentials(creds))
	//} else {
	//	opts = append(opts, grpc.WithInsecure())
	//}

	grpcDial, err := grpc.Dial(rawUrl, opts...)
	if err != nil {
		return nil, err
	}

	client := &Client{
		tmClient:       tmservice.NewServiceClient(grpcDial),
		txClient:       tx.NewServiceClient(grpcDial),
		authClient:     authtypes.NewQueryClient(grpcDial),
		bankClient:     banktypes.NewQueryClient(grpcDial),
		stakingClient:  stakingtypes.NewQueryClient(grpcDial),
		slashingClient: slashingtypes.NewQueryClient(grpcDial),
		mintClient:     minttypes.NewQueryClient(grpcDial),
		ctx:            context.Background(),
		kycClient:      kyctypes.NewQueryClient(grpcDial),
	}
	return client, nil
}
