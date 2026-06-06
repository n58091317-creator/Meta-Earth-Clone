package layer1

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"sync"

	errorsmod "cosmossdk.io/errors"
	abci "github.com/cometbft/cometbft/abci/types"
	abciTypes "github.com/cometbft/cometbft/abci/types"
	crypto "github.com/cometbft/cometbft/proto/tendermint/crypto"
	ctypes "github.com/cometbft/cometbft/rpc/core/types"
	ics23 "github.com/confio/ics23/go"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/tx"
	sdk "github.com/cosmos/cosmos-sdk/types"
	commitmenttypes "github.com/cosmos/ibc-go/v6/modules/core/23-commitment/types"
	"github.com/spf13/pflag"
	kycTypes "github.com/st-chain/rollapp/x/kyc/types"
)

var DefaultGasLimit = uint64(5000000)

// ConvertProofs converts crypto.ProofOps into MerkleProof
func ConvertProofs(tmProof *crypto.ProofOps) (commitmenttypes.MerkleProof, error) {
	if tmProof == nil {
		return commitmenttypes.MerkleProof{}, errorsmod.Wrapf(commitmenttypes.ErrInvalidMerkleProof, "tendermint proof is nil")
	}
	// Unmarshal all proof ops to CommitmentProof
	proofs := make([]*ics23.CommitmentProof, len(tmProof.Ops))
	for i, op := range tmProof.Ops {
		var p ics23.CommitmentProof
		err := p.Unmarshal(op.Data)
		if err != nil || p.Proof == nil {
			return commitmenttypes.MerkleProof{}, errorsmod.Wrapf(commitmenttypes.ErrInvalidMerkleProof, "could not unmarshal proof op into CommitmentProof at index %d: %v", i, err)
		}
		proofs[i] = &p
	}
	return commitmenttypes.MerkleProof{
		Proofs: proofs,
	}, nil
}

type CanConvert interface {
	Marshal() ([]byte, error)
	Unmarshal(dAtA []byte) error
}

func ProtoType2Type[cm, tm CanConvert](src cm, dst tm) (err error) {
	srcBytes, err := src.Marshal()
	if err != nil {
		return err
	}
	protoErr := dst.Unmarshal(srcBytes)
	return protoErr

}

func TxBuilder(clientCtx client.Context, signerAddr, signerKeyName string, SizeLimit int64) func(msgs ...sdk.Msg) (*sdk.TxResponse, error) {
	clientCtx.FromAddress = sdk.MustAccAddressFromBech32(signerAddr)
	clientCtx.FromName = signerKeyName
	clientCtx.BroadcastMode = "block"
	gas_price := clientCtx.Viper.GetString("sync-hub-gas-price")
	if gas_price == "" {
		gas_price = "0urax"
	}
	var lk sync.Mutex
	txf := tx.NewFactoryCLI(clientCtx, &pflag.FlagSet{}).
		WithGasAdjustment(1.2).
		WithGasPrices(gas_price)

	gasLimit := DefaultGasLimit
	var taskNumber int = 0
	var senderFunc func(startIndex int, msgs ...sdk.Msg) (*sdk.TxResponse, error)
	senderFunc = func(startIndex int, msgs ...sdk.Msg) (*sdk.TxResponse, error) {
		for _, msg := range msgs {
			log.Info("sending msg", "url", sdk.MsgTypeURL(msg))
			if err := msg.ValidateBasic(); err != nil {
				log.Error("failed to validate msg", "err", err)
				return nil, err
			}
		}
		txf, err := txf.Prepare(clientCtx)
		if err != nil {
			return nil, fmt.Errorf("failed to prepare tx: %w", err)
		}
		_, adjusted, err := tx.CalculateGas(clientCtx, txf, msgs...)
		if err != nil {
			isSequence, expectedSequence, errSeq := CheckAccountSequence(err.Error())
			if isSequence && errSeq == nil {
				txf = txf.WithSequence(expectedSequence)
			} else {
				return nil, fmt.Errorf("failed to calculate gas: %w", err)
			}
		}

		log.Info("adjusted tx gas", "before", txf.Gas(), "adjusted", adjusted)
		if adjusted == 0 {
			adjusted = gasLimit
		}
		txf = txf.WithGas(adjusted)

		txUnsigned, err := txf.BuildUnsignedTx(msgs...)
		if err != nil {
			return nil, err
		}
		err = tx.Sign(txf, clientCtx.GetFromName(), txUnsigned, true)
		if err != nil {
			return nil, err
		}
		txBytes, err := clientCtx.TxConfig.TxEncoder()(txUnsigned.GetTx())
		if err != nil {
			return nil, err
		}
		if int64(len(txBytes)) >= SizeLimit {
			//split two msg to send
			if len(msgs) < 2 {
				return nil, fmt.Errorf("tx size is too large, and the number of msgs is less than 2")
			}
			log.Info("split msgs to send", "msg_num", len(msgs))
			midIndex := len(msgs) / 2
			res, err := senderFunc(startIndex, msgs[0:midIndex]...)
			if err != nil || res.Code != 0 {
				return res, err
			}
			//send anther msg
			return senderFunc(startIndex+midIndex, msgs[midIndex:]...)
		}

		// broadcast to a Tendermint node

		log.Info("broadcasting", "tx", fmt.Sprintf("%x", sha256.Sum256(txBytes)), "tx_size", len(txBytes), "msg_start_end", fmt.Sprintf("[%d_%d)", startIndex, startIndex+len(msgs)), "task_number", taskNumber)
		res, err := clientCtx.BroadcastTx(txBytes)
		if err != nil && res != nil {
			if strings.Contains(res.RawLog, "out of gas") {
				gasLimit = gasLimit + DefaultGasLimit
				return senderFunc(startIndex, msgs...)
			}
		}
		return res, err
	}
	return func(msgs ...sdk.Msg) (*sdk.TxResponse, error) {
		lk.Lock()
		defer lk.Unlock()
		taskNumber += 1
		return senderFunc(0, msgs...)
	}
}

func getKycEventFromTx(tx []*ctypes.ResultTx) ([]*KycEvent, error) {
	var kycEvents []*KycEvent
	for _, tx := range tx {
		if tx.TxResult.Code != 0 {
			continue
		}
		for _, event := range tx.TxResult.Events {
			if event.Type == "kyc_event" {
				ke, err := newKycEvent(event, tx.Height)
				if err != nil {
					log.Error("failed to parse kyc event", "err", err)
					return nil, err
				}
				kycEvents = append(kycEvents, ke)
			}
		}
	}
	return kycEvents, nil
}

type KycEvent struct {
	address string
	did     string
	seq     int64
	height  int64
}

func newKycEvent(event abciTypes.Event, txHeight int64) (*KycEvent, error) {
	var address, did, seq string
	for _, v := range event.Attributes {
		if v.Key == "address" {
			address = string(v.Value)
		}
		if v.Key == "did" {
			did = string(v.Value)
		}
		if v.Key == "sequence" {
			seq = string(v.Value)
		}
	}
	seqInt, err := strconv.ParseInt(seq, 10, 64)
	if err != nil {
		return nil, err
	}
	return &KycEvent{
		address: address,
		did:     did,
		seq:     seqInt,
		height:  txHeight,
	}, nil
}

func checkSequenceContinuity(events []*KycEvent) bool {
	// check if the sequence is continuous
	if len(events) == 0 {
		return true
	}
	fromSeq := events[0].seq
	for i := 0; i < len(events); i++ {
		if events[i].seq != fromSeq+int64(i) {
			log.Error("sequence is not continuous", "expected", fromSeq+int64(i), "got", events[i].seq)
			return false
		}
	}
	return true
}

type updateCache struct {
	DIDs      []string
	Addresses []string
	client    *Synchronizer
	count     int
	checker   func(did string, address string) bool
	limit     int
}

func newUpdateCache(client *Synchronizer) *updateCache {
	return &updateCache{
		client: client,
		count:  0,
		//if want improve limit ,set the maxBytes in genesis.json and block_batch_max_size_bytes in dymint.toml
		limit: 1000,
	}
}
func (c *updateCache) withChecker(checker func(did string, address string) bool) *updateCache {
	c.checker = checker
	return c
}

func (c *updateCache) addDID(ctx context.Context, did string) error {
	if c.checker != nil && !c.checker(did, "") {
		return nil
	}

	c.DIDs = append(c.DIDs, did)
	c.count += 1
	if len(c.DIDs)+len(c.Addresses) > c.limit {
		err := c.client.UpdateKYC(ctx, c.DIDs, c.Addresses)
		if err != nil {
			return err
		}
		log.Info("flushing cache", "count", c.count)
		// clear the cache
		c.DIDs = []string{}
		c.Addresses = []string{}
	}
	return nil
}
func (c *updateCache) addAddress(ctx context.Context, address string) error {
	if c.checker != nil && !c.checker("", address) {
		return nil
	}
	c.count += 1
	c.Addresses = append(c.Addresses, address)
	if len(c.DIDs)+len(c.Addresses) > c.limit {
		err := c.client.UpdateKYC(ctx, c.DIDs, c.Addresses)
		if err != nil {
			return err
		}
		log.Info("flushing cache", "count", c.count)
		// clear the cache
		c.DIDs = []string{}
		c.Addresses = []string{}
	}
	return nil
}
func (c *updateCache) flush(ctx context.Context) error {
	log.Info("flushing cache", "count", c.count)
	return c.client.UpdateKYC(ctx, c.DIDs, c.Addresses)
}

func MakeCombineProofFormRes(QueryResults []*abci.ResponseQuery) (*ProofInfo, error) {
	pi := &ProofInfo{}
	proofs := []*ics23.CommitmentProof{}
	setStoreRoot := false
	for _, res := range QueryResults {
		merkleTree, err := ConvertProofs(res.ProofOps)
		if err != nil {
			return nil, fmt.Errorf("failed to convert proofs: %w", err)
		}
		proofs = append(proofs, merkleTree.Proofs[0])
		if !setStoreRoot {
			storeHash := merkleTree.Proofs[1].GetExist().Value
			storeProof := merkleTree.Proofs[1]
			proofBz, err := storeProof.Marshal()
			if err != nil {
				return nil, fmt.Errorf("failed to marshal store proof: %w", err)
			}
			setStoreRoot = true
			pi.StoreRoot = storeHash
			pi.StoreProof = proofBz
		}
		pi.Items = append(pi.Items, &kycTypes.Item{
			Key:   res.Key,
			Value: res.Value,
		})
		if len(res.Value) == 0 {
			log.Logger.Warnf("empty value in query result, key: %s", base64.StdEncoding.EncodeToString(res.Key))
		}
	}
	combineProof, err := ics23.CombineProofs(proofs)
	if err != nil {
		return nil, err
	}
	proofBz, err := combineProof.Marshal()
	if err != nil {
		return nil, fmt.Errorf("failed to marshal store proof: %w", err)
	}
	pi.Proofs = proofBz
	return pi, nil
}
func getProofsFromQueryResults(QueryResults []*abci.ResponseQuery) (haveValueProofInfo, nonValueProofInfo *ProofInfo, err error) {
	haveValueRes := make([]*abci.ResponseQuery, 0)
	NonValueRes := make([]*abci.ResponseQuery, 0)
	for _, res := range QueryResults {
		if len(res.Value) == 0 {
			NonValueRes = append(NonValueRes, res)
			continue
		}
		haveValueRes = append(haveValueRes, res)
	}
	haveValueProofInfo, err = MakeCombineProofFormRes(haveValueRes)
	if err != nil {
		return nil, nil, err
	}
	if len(NonValueRes) == 0 {
		return haveValueProofInfo, nil, nil
	}
	nonValueProofInfo, err = MakeCombineProofFormRes(NonValueRes)
	if err != nil {
		return nil, nil, err
	}
	return
}

type ProofInfo struct {
	StoreRoot  []byte
	StoreProof []byte
	Proofs     []byte
	Items      []*kycTypes.Item
}

func CheckAccountSequence(errorMessage string) (bool, uint64, error) {
	if strings.Contains(errorMessage, "account sequence mismatch") {
		re, err := regexp.Compile("expected ([0-9]+),")
		if err != nil {
			fmt.Printf("error %s", err.Error())
		} else {
			submatch := re.FindStringSubmatch(errorMessage)
			if len(submatch) == 2 {
				if u, err := strconv.ParseUint(submatch[1], 10, 64); err == nil {
					return true, u, nil
				}
				return true, 0, fmt.Errorf("error getting account seq: %s", err.Error())
			}
		}
	}
	return false, 0, nil
}
