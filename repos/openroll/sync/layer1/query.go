package layer1

import (
	"context"
	"fmt"
	"strings"

	abci "github.com/cometbft/cometbft/abci/types"
	cmclient "github.com/cometbft/cometbft/rpc/client"
	ctypes "github.com/cometbft/cometbft/rpc/core/types"
	cmtypes "github.com/cometbft/cometbft/types"
	"github.com/cosmos/cosmos-sdk/store/rootmulti"
	sdk "github.com/cosmos/cosmos-sdk/types"
	legacyerrors "github.com/cosmos/cosmos-sdk/types/errors"
	"github.com/cosmos/cosmos-sdk/types/query"
	stakingtypes "github.com/cosmos/cosmos-sdk/x/staking/types"
	"github.com/cosmos/ibc-go/v6/modules/core/02-client/client/utils"
	ibcClientTypes "github.com/cosmos/ibc-go/v6/modules/core/02-client/types"
	ibcexported "github.com/cosmos/ibc-go/v6/modules/core/exported"
	ibctmtypes "github.com/cosmos/ibc-go/v6/modules/light-clients/07-tendermint/types"
	kycTypes "github.com/st-chain/rollapp/x/kyc/types"
	regionTypes "github.com/st-chain/rollapp/x/region/types"
	tmtypes "github.com/tendermint/tendermint/proto/tendermint/types"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (s *Synchronizer) queryMeKYCs(ctx context.Context, height int64, HubKycReq kycTypes.QueryMeKycsRequest) (KYCs *kycTypes.QueryMeKycsResponse, actualHeight int64, err error) {
	reqBz, err := HubKycReq.Marshal()
	if err != nil {
		return nil, 0, err
	}
	req := abci.RequestQuery{
		Path:   "/metaearth.kyc.Query/KYCs",
		Height: height, //0 represent the latest height
		Data:   reqBz,
		Prove:  false,
	}
	res, err := s.QueryHubABCI(ctx, req)
	if err != nil {
		return nil, 0, err
	}
	var kycs kycTypes.QueryMeKycsResponse
	err = kycs.Unmarshal(res.Value)
	return &kycs, res.Height, err
}
func (s *Synchronizer) queryMeDidInfos(ctx context.Context, height int64, HubKycReq kycTypes.QueryMeDidInfoRequest) (KYCs *kycTypes.QueryMeDidInfoResponse, actualHeight int64, err error) {
	reqBz, err := HubKycReq.Marshal()
	if err != nil {
		return nil, 0, err
	}
	req := abci.RequestQuery{
		Path:   "/metaearth.did.Query/DidInfos",
		Height: height, //0 represent the latest height
		Data:   reqBz,
		Prove:  false,
	}
	res, err := s.QueryHubABCI(ctx, req)
	if err != nil {
		return nil, 0, err
	}
	var kycs kycTypes.QueryMeDidInfoResponse
	err = kycs.Unmarshal(res.Value)
	return &kycs, res.Height, err
}
func (s *Synchronizer) queryMeRegions(ctx context.Context, height int64, HubKycReq regionTypes.QueryMeAllRegionRequest) (KYCs *regionTypes.QueryMeAllRegionResponse, actualHeight int64, err error) {
	reqBz, err := HubKycReq.Marshal()
	if err != nil {
		return nil, 0, err
	}
	req := abci.RequestQuery{
		Path:   "/metaearth.wstaking.Query/AllRegion",
		Height: height, //0 represent the latest height
		Data:   reqBz,
		Prove:  false,
	}
	res, err := s.QueryHubABCI(ctx, req)
	if err != nil {
		return nil, 0, err
	}
	var MeRegions regionTypes.QueryMeAllRegionResponse
	err = MeRegions.Unmarshal(res.Value)
	return &MeRegions, res.Height, err
}
func (s *Synchronizer) queryMeUnbondingTime(ctx context.Context, height int64, HubKycReq stakingtypes.QueryParamsRequest) (params *stakingtypes.QueryParamsResponse, actualHeight int64, err error) {
	reqBz, err := HubKycReq.Marshal()
	if err != nil {
		return nil, 0, err
	}
	req := abci.RequestQuery{
		Path:   "/cosmos.staking.v1beta1.Query/Params",
		Height: height, //0 represent the latest height
		Data:   reqBz,
		Prove:  false,
	}
	res, err := s.QueryHubABCI(ctx, req)
	if err != nil {
		return nil, 0, err
	}
	var param stakingtypes.QueryParamsResponse
	err = param.Unmarshal(res.Value)
	return &param, res.Height, err
}

func (s *Synchronizer) queryRollappRegions(ctx context.Context) ([]regionTypes.Region, error) {
	client := regionTypes.NewQueryClient(s.ClientCtx)
	res, err := client.RegionAll(ctx, &regionTypes.QueryAllRegionRequest{
		Pagination: &query.PageRequest{
			Limit: 1000,
		},
	})
	if err != nil {
		return nil, err
	}
	if res == nil {
		return nil, fmt.Errorf("failed to query regions")
	}
	return res.Region, nil

}
func (s *Synchronizer) QueryCredentialWithProof(ctx context.Context, dids []string, height int64) ([]*abci.ResponseQuery, error) {
	var results []*abci.ResponseQuery
	for _, did := range dids {
		//0x40+did+kyc
		key := kycTypes.GetCredentialKey(did)
		req := abci.RequestQuery{
			Path:   fmt.Sprintf("store/%s/key", "did"),
			Height: height - 1,
			Data:   key,
			Prove:  true,
		}
		res, err := s.QueryHubABCI(ctx, req)
		if err != nil {
			return nil, fmt.Errorf("failed to query credential: %w", err)
		}
		results = append(results, &res)
	}
	return results, nil
}

func (s *Synchronizer) QueryDIDWithProof(ctx context.Context, addresses []string, height int64) ([]*abci.ResponseQuery, error) {
	var results []*abci.ResponseQuery
	for _, address := range addresses {
		key := kycTypes.MeHubDIDPrefix
		addr, err := sdk.AccAddressFromBech32(address)
		if err != nil {
			return nil, fmt.Errorf("failed to parse address: %w", err)
		}
		//0x10+AccAddress
		key = append(key, addr...)
		req := abci.RequestQuery{
			Path:   fmt.Sprintf("store/%s/key", "did"),
			Height: height - 1, //0 represent the latest height
			Data:   key,
			Prove:  true,
		}
		res, err := s.QueryHubABCI(ctx, req)
		if err != nil {
			return nil, fmt.Errorf("failed to query did: %w", err)
		}
		results = append(results, &res)
	}

	return results, nil
}

func (s *Synchronizer) QueryHubHeader(ctx context.Context, height int64) (ibctmtypes.Header, int64, error) {
	info, err := s.meClient.ABCIInfo(ctx)
	if err != nil {
		return ibctmtypes.Header{}, 0, err
	}
	if height == 0 {
		height = info.Response.LastBlockHeight
	}

	commit, err := s.meClient.Commit(context.Background(), &height)
	if err != nil {
		return ibctmtypes.Header{}, 0, err
	}
	var protoCommit tmtypes.SignedHeader
	err = ProtoType2Type(commit.SignedHeader.ToProto(), &protoCommit)
	if err != nil {
		return ibctmtypes.Header{}, 0, fmt.Errorf("failed to convert commit header: %w", err)
	}

	page := 1
	count := 10_000

	validators, err := s.meClient.Validators(context.Background(), &height, &page, &count)
	if err != nil {
		return ibctmtypes.Header{}, 0, fmt.Errorf("failed to get validators: %v", err)
	}

	valSet, err := cmtypes.NewValidatorSet(validators.Validators).ToProto()
	if err != nil {
		return ibctmtypes.Header{}, 0, fmt.Errorf("failed to convert validator set: %w", err)
	}
	var protoValset tmtypes.ValidatorSet
	err = ProtoType2Type(valSet, &protoValset)
	if err != nil {
		return ibctmtypes.Header{}, 0, fmt.Errorf("failed to convert validator to tmtypes.ValidatorSet set: %w", err)
	}
	header := ibctmtypes.Header{
		SignedHeader: &protoCommit,
		ValidatorSet: &protoValset,
	}
	return header, height, nil
}

// QueryTrustedHeader
func (s *Synchronizer) QueryTrustedHeader(ctx context.Context) (ibctmtypes.Header, ibcexported.Height, error) {
	cs, err := s.queryLightState(ctx)
	if err != nil {
		return ibctmtypes.Header{}, nil, fmt.Errorf("failed to query light state: %w", err)
	}
	height := cs.GetLatestHeight().GetRevisionHeight()
	trustHeader, _, err := s.QueryHubHeader(ctx, int64(height+1))
	return trustHeader, cs.GetLatestHeight(), err
}

// queryLightState query the me-hub light state on rollApp
func (s *Synchronizer) queryLightState(ctx context.Context) (ibcexported.ClientState, error) {
	r, err := utils.QueryClientState(s.ClientCtx, s.MeClientID, false)
	if err != nil {
		return nil, err
	}
	css, err := ibcClientTypes.UnpackClientState(r.ClientState)
	if err != nil {
		return nil, err
	}
	return css, nil

}

// QueryHubABCI performs an ABCI query and returns the appropriate response and error sdk error code.
func (cc *Synchronizer) QueryHubABCI(ctx context.Context, req abci.RequestQuery) (abci.ResponseQuery, error) {
	opts := cmclient.ABCIQueryOptions{
		Height: req.Height,
		Prove:  req.Prove,
	}

	result, err := cc.meClient.ABCIQueryWithOptions(ctx, req.Path, req.Data, opts)
	if err != nil {
		return abci.ResponseQuery{}, err
	}

	if !result.Response.IsOK() {
		return abci.ResponseQuery{}, sdkErrorToGRPCError(result.Response)
	}

	// data from trusted node or subspace query doesn't need verification
	if !opts.Prove || !isQueryStoreWithProof(req.Path) {
		return result.Response, nil
	}

	return result.Response, nil
}

// isQueryStoreWithProof expects a format like /<queryType>/<storeName>/<subpath>
// queryType must be "store" and subpath must be "key" to require a proof.
func isQueryStoreWithProof(path string) bool {
	if !strings.HasPrefix(path, "/") {
		return false
	}

	paths := strings.SplitN(path[1:], "/", 3)

	switch {
	case len(paths) != 3:
		return false
	case paths[0] != "store":
		return false
	case rootmulti.RequireProof("/" + paths[2]):
		return true
	}

	return false
}
func sdkErrorToGRPCError(resp abci.ResponseQuery) error {
	switch resp.Code {
	case legacyerrors.ErrInvalidRequest.ABCICode():
		return status.Error(codes.InvalidArgument, resp.Log)
	case legacyerrors.ErrUnauthorized.ABCICode():
		return status.Error(codes.Unauthenticated, resp.Log)
	case legacyerrors.ErrKeyNotFound.ABCICode():
		return status.Error(codes.NotFound, resp.Log)
	default:
		return status.Error(codes.Unknown, resp.Log)
	}
}

func (s *Synchronizer) QueryKycEvents(ctx context.Context, fromHeight, endHeight int64, fromSequence int64, page, perPage int) (nextSearchPage, error) {
	req := fmt.Sprintf("tx.height>=%d AND tx.height<=%d AND kyc_event.action EXISTS AND kyc_event.sequence >= %d", fromHeight, endHeight, fromSequence)
	done := false
	return func() (*ctypes.ResultTxSearch, error) {
		if done {
			return nil, nil
		}
		res, err := s.meClient.TxSearch(
			ctx,
			req,
			false,
			&page,
			&perPage,
			"asc",
		)
		if err != nil {
			return nil, err
		}
		if page*perPage >= res.TotalCount {
			done = true
		}
		page++
		return res, err
	}, nil

}

type nextSearchPage func() (*ctypes.ResultTxSearch, error)

func (s *Synchronizer) QueryKycEventSequence(ctx context.Context, height int64) (*kycTypes.KycEventSeq, int64, error) {
	if height < 0 {
		height = 0
	}
	key := []byte("KycEventSeq/value/")
	key = append(key, 0)
	req := abci.RequestQuery{
		Path:   fmt.Sprintf("store/%s/key", "kyc"),
		Height: height,
		Data:   key,
		Prove:  false,
	}
	res, err := s.QueryHubABCI(ctx, req)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query credential: %w", err)
	}
	var KycSeq kycTypes.KycEventSeq
	err = KycSeq.Unmarshal(res.Value)
	return &KycSeq, res.Height, err
}
