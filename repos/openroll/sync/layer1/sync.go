package layer1

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"
	"strings"
	"time"

	abci "github.com/cometbft/cometbft/abci/types"
	rpchttp "github.com/cometbft/cometbft/rpc/client/http"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/query"
	dymintconf "github.com/st-chain/dymint/config"

	tmabci "github.com/tendermint/tendermint/abci/types"

	goLog "github.com/ipfs/go-log/v2"
	logger "github.com/st-chain/rollapp/logger"
	hatypes "github.com/st-chain/rollapp/x/hubauth/types"
	"github.com/st-chain/rollapp/x/kyc/types"
	kycTypes "github.com/st-chain/rollapp/x/kyc/types"
	rpcClient "github.com/tendermint/tendermint/rpc/client"
)

var log = logger.NewLogger("me-syncer").WithEnvLevelOr("info").WithStacktrace(goLog.LevelError)

type Synchronizer struct {
	rollClient          rpcClient.Client
	meClient            *rpchttp.HTTP
	MeClientID          string
	WaitUpdateData      *WaitUpdateData
	SignerAddr          string
	cdc                 codec.Codec
	AppQuery            func(req tmabci.RequestQuery) (res tmabci.ResponseQuery)
	ClientCtx           client.Context
	TxSender            func(msgs ...sdk.Msg) (*sdk.TxResponse, error)
	nextHubBlockNotify  chan int64
	db                  *kycDB
	msgSizeLimit        int64
	lightClientUpdating chan struct{}
}

func NewSynchronizer(rollApp rpcClient.Client, nodeConfig *dymintconf.NodeConfig, cdc codec.Codec, cctx client.Context) (*Synchronizer, error) {
	//mehubAddr can load from conf.SettlementConfig.NodeAddress
	keyName := cctx.Viper.GetString("sync-hub-key-name")
	keyAddress := cctx.Viper.GetString("sync-hub-key-address")
	meHub, err := rpchttp.New(nodeConfig.SettlementConfig.NodeAddress, "/websocket")
	if err != nil {
		return nil, fmt.Errorf("init me-hub client failed")
	}
	meHub.Logger = &logger.WrapCmLogger{MeLogger: log}
	db, err := newGoLevelDB(cctx.HomeDir)
	if err != nil {
		return nil, err
	}

	params, err := rollApp.ConsensusParams(context.TODO(), nil)
	if err != nil {
		return nil, err
	}
	maxBlockBytes := params.ConsensusParams.Block.MaxBytes
	maxMpoolTxBytes := nodeConfig.MempoolConfig.MaxTxBytes

	limitBytes := min(maxBlockBytes, int64(maxMpoolTxBytes))

	if os.Getenv("CLEAR_SEQ") == "true" {
		if err := db.ClearSeq(); err != nil {
			return nil, err
		}
	}

	meClientId := hatypes.DefaultClientId
	if tendermintClient := os.Getenv("TENDERMINT_CLIENT"); tendermintClient != "" {
		meClientId = tendermintClient
	}

	hubauth, err := hatypes.NewQueryClient(cctx).Params(context.Background(), &hatypes.QueryParamsRequest{})
	if err != nil {
		if hubauth != nil {
			if hubauth.Params.ClientId != "" {
				meClientId = hubauth.Params.ClientId
			}
		}
	}

	return &Synchronizer{
		rollClient: rollApp,
		meClient:   meHub,
		WaitUpdateData: &WaitUpdateData{
			DID:     make(chan string, 1024),
			Address: make(chan string, 1024),
		},
		MeClientID:          meClientId,
		cdc:                 cdc,
		ClientCtx:           cctx,
		SignerAddr:          keyAddress,
		TxSender:            TxBuilder(cctx, keyAddress, keyName, int64(float64(limitBytes)*0.85)),
		nextHubBlockNotify:  make(chan int64),
		db:                  db,
		msgSizeLimit:        int64(float64(limitBytes) * 0.85),
		lightClientUpdating: make(chan struct{}, 1),
		//meChainID: "mechain_100-1",
	}, nil
}
func NewSynchronizerInstanceNoDB(rollApp rpcClient.Client, nodeConfig *dymintconf.NodeConfig, cdc codec.Codec, cctx client.Context, keyName, keyAddress string) (*Synchronizer, error) {
	//mehubAddr can load from conf.SettlementConfig.NodeAddress
	fmt.Println("nodeConfig.SettlementConfig.NodeAddress:", nodeConfig.SettlementConfig.NodeAddress)
	meHub, err := rpchttp.New(nodeConfig.SettlementConfig.NodeAddress, "/websocket")
	if err != nil {
		return nil, fmt.Errorf("init me-hub client failed")
	}
	meHub.Logger = &logger.WrapCmLogger{MeLogger: log}

	limitBytes := 1048576

	hubauth, err := hatypes.NewQueryClient(cctx).Params(context.TODO(), &hatypes.QueryParamsRequest{})
	if err != nil {
		return nil, err
	}
	return &Synchronizer{
		rollClient: rollApp,
		meClient:   meHub,
		WaitUpdateData: &WaitUpdateData{
			DID:     make(chan string, 1024),
			Address: make(chan string, 1024),
		},
		MeClientID:         hubauth.Params.ClientId,
		cdc:                cdc,
		ClientCtx:          cctx,
		SignerAddr:         keyAddress,
		TxSender:           TxBuilder(cctx, keyAddress, keyName, int64(float64(limitBytes)*0.85)),
		nextHubBlockNotify: make(chan int64),
		db:                 nil,
		msgSizeLimit:       int64(float64(limitBytes) * 0.85),
		//meChainID: "mechain_100-1",
	}, nil
}
func (s *Synchronizer) Start(ctx context.Context) {

	log.Info("start me-sync init")
	s.meClient.Start()
	go s.ProcessUpdateData(ctx)
	go func(ctx context.Context) {
		for {
			err := s.listenHubBlock(ctx)
			if err != nil {
				log.Error(err.Error())
			}
			select {
			case <-ctx.Done():
				return
			default:
				time.Sleep(10 * time.Second)
			}
		}

	}(ctx)
	s.CheckLightClient(ctx)
	go s.RegionSync(ctx)
	//go s.initKycStates(ctx)
	go s.PeriodicKycSync(ctx)
	go func(ctx context.Context) {
		for {
			err := s.ListenEventOnHub(ctx)
			if err != nil {
				log.Error(err.Error())
			}
			select {
			case <-ctx.Done():
				return
			default:
				time.Sleep(10 * time.Second)
			}
		}

	}(ctx)
}

func (s *Synchronizer) CreateUpdateDidMsg(res []*abci.ResponseQuery) ([]sdk.Msg, error) {
	// TODO: verify proof
	if len(res) == 0 {
		return nil, fmt.Errorf("no query result")
	}

	msgs, err := CreateMsgsWithLimitSize(s, res, func(res []*abci.ResponseQuery) (*kycTypes.MsgUpdateDID, error) {
		pi, err := MakeCombineProofFormRes(res)
		if err != nil {
			return nil, err
		}
		msg := kycTypes.NewMsgUpdateDID(
			s.SignerAddr,
			uint64(res[0].Height+1),
			pi.Items,
			pi.Proofs,
			pi.StoreProof,
			pi.StoreRoot,
		)
		if err := msg.ValidateBasic(); err != nil {
			return nil, fmt.Errorf("failed to validate basic: %w", err)
		}
		return msg, nil
	})
	var sdkMsg []sdk.Msg
	for _, msg := range msgs {
		sdkMsg = append(sdkMsg, msg)
	}
	return sdkMsg, err
}

func (s *Synchronizer) CreateUpdateCredentialMsg(res []*abci.ResponseQuery) ([]sdk.Msg, error) {
	// TODO: verify proof
	if len(res) == 0 {
		return nil, fmt.Errorf("no query result")
	}
	haveValueRes := make([]*abci.ResponseQuery, 0)
	NonValueRes := make([]*abci.ResponseQuery, 0)
	for _, res := range res {
		if len(res.Value) == 0 {
			NonValueRes = append(NonValueRes, res)
			continue
		}
		haveValueRes = append(haveValueRes, res)
	}
	var sdkMsg []sdk.Msg
	if len(haveValueRes) != 0 {
		updateKycMsgs, err := CreateMsgsWithLimitSize(s, haveValueRes, func(res []*abci.ResponseQuery) (*kycTypes.MsgUpdateCredential, error) {
			pi, err := MakeCombineProofFormRes(res)
			if err != nil {
				return nil, err
			}

			msg := &kycTypes.MsgUpdateCredential{
				Creator:     s.SignerAddr,
				ProofHeight: uint64(res[0].Height + 1),
				Credentials: pi.Items,
				StoreHash:   pi.StoreRoot,
				StoreProof:  pi.StoreProof,
				Proofs:      pi.Proofs,
			}
			if err := msg.ValidateBasic(); err != nil {
				return nil, fmt.Errorf("failed to validate basic: %w", err)
			}
			return msg, nil
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create update kyc msg: %w", err)
		}
		for _, msg := range updateKycMsgs {
			sdkMsg = append(sdkMsg, msg)
		}
	}
	if len(NonValueRes) != 0 {
		removeKycMsgs, err := CreateMsgsWithLimitSize(s, NonValueRes, func(res []*abci.ResponseQuery) (*kycTypes.MsgRemoveKyc, error) {
			pi, err := MakeCombineProofFormRes(res)
			if err != nil {
				return nil, err
			}

			msg := &kycTypes.MsgRemoveKyc{
				Creator:     s.SignerAddr,
				ProofHeight: uint64(res[0].Height + 1),
				Credentials: pi.Items,
				StoreHash:   pi.StoreRoot,
				StoreProof:  pi.StoreProof,
				Proofs:      pi.Proofs,
			}
			if err := msg.ValidateBasic(); err != nil {
				return nil, fmt.Errorf("failed to validate basic: %w", err)
			}
			return msg, nil
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create remove kyc msg: %w", err)
		}
		for _, msg := range removeKycMsgs {
			sdkMsg = append(sdkMsg, msg)
		}
	}

	return sdkMsg, nil
}

type MsgSizeInterface interface {
	Size() int
}

func CreateMsgsWithLimitSize[T MsgSizeInterface](s *Synchronizer, res []*abci.ResponseQuery, msgCreator func(res []*abci.ResponseQuery) (T, error)) ([]T, error) {
	// Handle empty input
	if len(res) == 0 {
		return nil, nil
	}
	msg, err := msgCreator(res)
	if err != nil {
		return nil, err
	}
	if msg.Size() > int(s.msgSizeLimit) {
		if len(res) == 1 {
			return nil, fmt.Errorf("single message size %d exceeds limit %d", msg.Size(), s.msgSizeLimit)
		}
		// Split res
		log.Info("the msg was too large, splitting data to more msgs",
			"size", msg.Size(),
			"limit", s.msgSizeLimit,
			"items", len(res))
		midIndex := len(res) / 2
		leftMsgs, err := CreateMsgsWithLimitSize(s, res[:midIndex], msgCreator)
		if err != nil {
			return nil, err
		}
		rightMsgs, err := CreateMsgsWithLimitSize(s, res[midIndex:], msgCreator)
		if err != nil {
			return nil, err
		}
		msgs := make([]T, 0, len(leftMsgs)+len(rightMsgs))
		msgs = append(msgs, leftMsgs...)
		msgs = append(msgs, rightMsgs...)
		return msgs, nil
	}
	return []T{msg}, err
}

type WaitUpdateData struct {
	DID     chan string
	Address chan string
}

func (s *Synchronizer) initKycStates(ctx context.Context) {
	header, err := s.meClient.Header(ctx, nil)
	if err != nil {
		log.Error(err.Error())
		return
	}
	height := header.Header.Height - 3
	if height < 1 {
		height = 1
	}

	loopRun := func() error {
		seq, err := s.db.GetLatestSequence()
		if err != nil {
			return err
		}
		if seq != nil {
			log.Info("got latest kyc event sequence from db", "seq", seq.Seq, "height", seq.Height)
			return nil
		}
		t := time.Now()
		defer func() {
			log.Info("sync kyc states done", "cost", time.Since(t))
		}()
		log.Info("start sync kyc states")

		err = s.updateAllAddressByDidInfo(ctx, height)
		if err != nil {
			return err
		}

		err = s.updateAllDID(ctx, height)
		if err != nil {
			return err
		}

		kycSeq, seqHeight, err := s.QueryKycEventSequence(ctx, height-2)
		if err != nil {
			return err
		}

		err = s.db.UpdateLatestSequence(int64(kycSeq.Seq), seqHeight)
		if err != nil {
			return err
		}
		return err
	}

	for {
		err := loopRun()
		if err != nil {
			log.Error(err.Error())
			time.Sleep(10 * time.Second)
			continue
		}
		break
	}
}

func (s *Synchronizer) updateAllDID(ctx context.Context, height int64) error {
	req := types.QueryMeKycsRequest{
		Pagination: &query.PageRequest{
			Limit: 200,
		},
	}
	cache := newUpdateCache(s).withChecker(func(did, address string) bool {
		//check status
		ok, err := s.VerifyDIDUpdateRequired(did, height)
		if err != nil {
			return false
		}
		if !ok {
			log.Info("does't need update at height", "DID", did, "height", height)
			return false
		}
		return true
	})
	for {
		res, _, err := s.queryMeKYCs(ctx, height, req)
		if err != nil {
			return err
		}
		for _, v := range res.KYCs {

			err = cache.addDID(ctx, v.Did)
			if err != nil {
				return err
			}

		}
		if res.Pagination == nil || len(res.Pagination.NextKey) == 0 {
			break
		}
		req = types.QueryMeKycsRequest{
			Regionid: req.Regionid,
			Pagination: &query.PageRequest{
				Key: res.Pagination.GetNextKey(),
			},
		}
	}
	err := cache.flush(ctx)
	if err != nil {
		return err
	}
	return nil
}

func (s *Synchronizer) updateAllAddressByDidInfo(ctx context.Context, height int64) error {
	req := types.QueryMeDidInfoRequest{
		&query.PageRequest{
			Limit: 200,
		},
	}
	cache := newUpdateCache(s).withChecker(func(did, address string) bool {
		//check status
		ok, err := s.VerifyAddressUpdateRequired(address, height)
		if err != nil {
			return false
		}
		if !ok {
			log.Info("doesn't need update at height", "address", address, "height", height)
			return false
		}
		return true
	})
	for {
		res, _, err := s.queryMeDidInfos(ctx, height, req)
		if err != nil {
			return err
		}
		for _, v := range res.Infos {
			if v.Address == "" {
				continue
			}
			err = cache.addAddress(ctx, v.Address)
			if err != nil {
				return err
			}
		}
		if res.Pagination == nil || len(res.Pagination.NextKey) == 0 {
			break
		}
		req = types.QueryMeDidInfoRequest{
			Pagination: &query.PageRequest{
				Key: res.Pagination.GetNextKey(),
			},
		}
		log.Info("queryMeDidInfos key: ", "key", base64.StdEncoding.EncodeToString(res.Pagination.GetNextKey()))
	}
	err := cache.flush(ctx)
	if err != nil {
		return err
	}
	return nil
}

func (s *Synchronizer) PeriodicKycSync(ctx context.Context) error {
	tick := time.NewTicker(time.Second)
	for {
		select {
		case <-ctx.Done():
			log.Error(ctx.Err().Error())
			return nil
		case <-tick.C:
			tick.Reset(5 * time.Minute)
			for {
				time.Sleep(5 * time.Second)
				log.Info("start daily kyc update")
				t := time.Now()
				// err := s.SyncKycEvents(ctx)
				err := s.SyncKycEvents(ctx)
				if err != nil {
					log.Error(err.Error())
					continue
				}
				log.Info("daily kyc update done", "cost", time.Since(t))
				break
			}

		}
	}
}

func (s *Synchronizer) VerifyDIDUpdateRequired(did string, height int64) (bool, error) {
	h, err := s.db.GetDID(did)
	if err != nil {
		return false, err
	}
	return height > h, nil
}
func (s *Synchronizer) VerifyAddressUpdateRequired(address string, height int64) (bool, error) {
	h, err := s.db.GetAddress(address)
	if err != nil {
		return false, err
	}
	return height > h, nil
}

func (s *Synchronizer) ProcessKycEvents(ctx context.Context, events []*KycEvent) error {
	if len(events) == 0 {
		return nil
	}
	cache := newUpdateCache(s)
	for _, evt := range events {
		yes, err := s.VerifyDIDUpdateRequired(evt.did, evt.height)
		if err != nil {
			return fmt.Errorf("checkEventFromHeight VerifyDIDUpdateRequired %+v", err)
		}
		if yes {
			err = cache.addDID(ctx, evt.did)
			if err != nil {
				return err
			}
		}

		yes, err = s.VerifyAddressUpdateRequired(evt.address, evt.height)
		if err != nil {
			return fmt.Errorf("checkEventFromHeight VerifyAddressUpdateRequired %+v", err)
		}
		if yes {
			err = cache.addAddress(ctx, evt.address)
			if err != nil {
				return err
			}
		}
	}
	err := cache.flush(ctx)
	if err != nil {
		return err
	}
	//save latest sequence
	return s.db.UpdateLatestSequence(events[len(events)-1].seq, events[len(events)-1].height)
}

func (s *Synchronizer) CheckLightClient(ctx context.Context) error {
	//check light state
	_, err := s.queryLightState(ctx)
	if err != nil {
		if !strings.Contains(err.Error(), "light client not found") {
			return fmt.Errorf("unexpected error:%+v", err)
		}
		log.Info("light client not found try to create")
		msg, err := s.CreateClientMsg(ctx)
		if err != nil {
			return err
		}
		res, err := s.TxSender(msg)
		if err != nil {
			return fmt.Errorf("failed to send tx: %w", err)
		}
		if res.Code != 0 {
			return fmt.Errorf("failed to create light client: %s", res.RawLog)
		}
		log.Info("exec created light-client tx success", "hash", res.TxHash, "code", res.Code)
	}
	return nil
}
