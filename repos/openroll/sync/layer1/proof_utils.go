package layer1

import (
	"context"
	"encoding/json"
	"fmt"

	abci "github.com/cometbft/cometbft/abci/types"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/ibc-go/v6/modules/core/02-client/types"
	dymintconf "github.com/st-chain/dymint/config"
)

type UpdateHelper struct {
	synchronizer *Synchronizer
}

func NewUpdateHelperFromSynchronizer(synchronizer *Synchronizer) *UpdateHelper {
	return &UpdateHelper{
		synchronizer: synchronizer,
	}
}
func NewUpdateHelper(nodeConfig *dymintconf.NodeConfig, cdc codec.Codec, cctx client.Context, signerAddr string) (*UpdateHelper, error) {
	syncer, err := NewSynchronizerInstanceNoDB(cctx.Client, nodeConfig, cdc, cctx, cctx.GetFromName(), signerAddr)
	if err != nil {
		return nil, err
	}
	return &UpdateHelper{
		synchronizer: syncer,
	}, nil
}

func (u *UpdateHelper) CreateUpdateClientMsg(ctx context.Context, height int64) (sdk.Msg, int64, error) {
	targetHeader, _, err := u.synchronizer.QueryHubHeader(ctx, height)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query update header: %w", err)
	}
	//get trusted header for light client
	trustedHeader, csHeight, err := u.synchronizer.QueryTrustedHeader(ctx)
	if err != nil {
		err = u.synchronizer.CheckLightClient(ctx)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to query trusted header: %w", err)
		}
	}
	targetHeader.TrustedHeight = csHeight.(types.Height)
	targetHeader.TrustedValidators = trustedHeader.ValidatorSet
	msg, err := types.NewMsgUpdateClient(u.synchronizer.MeClientID, &targetHeader, u.synchronizer.SignerAddr)
	return msg, targetHeader.Header.Height, err
}

func (u *UpdateHelper) queryProof(ctx context.Context, keys [][]byte, storeKey string, height int64) ([]*abci.ResponseQuery, error) {
	var results []*abci.ResponseQuery
	for _, key := range keys {

		req := abci.RequestQuery{
			Path:   fmt.Sprintf("store/%s/key", storeKey),
			Height: height - 1, //0 represent the latest height
			Data:   key,
			Prove:  true,
		}
		res, err := u.synchronizer.QueryHubABCI(ctx, req)
		if err != nil {
			return nil, fmt.Errorf("failed to query key: %s error:%w", string(key), err)
		}
		results = append(results, &res)
	}
	return results, nil
}

type Item struct {
	Key   []byte
	Value []byte
}

func CreateUpdateMsgs[T MsgSizeInterface, E any](u *UpdateHelper, res []*abci.ResponseQuery, msgConstructor func(signer string, proofHeight uint64, items []E, proofs, storeProof, storeRoot []byte) T) ([]T, error) {
	if len(res) == 0 {
		return nil, fmt.Errorf("the query result is empty")
	}

	msgs, err := CreateMsgsWithLimitSize(u.synchronizer, res, func(res []*abci.ResponseQuery) (T, error) {
		var zeroValue T
		pi, err := MakeCombineProofFormRes(res)
		if err != nil {

			return zeroValue, err
		}
		bz, err := json.Marshal(pi.Items)
		if err != nil {
			return zeroValue, fmt.Errorf("failed to marshal items: %w", err)
		}
		var targetItems []E
		err = json.Unmarshal(bz, &targetItems)
		if err != nil {
			return zeroValue, fmt.Errorf("failed to unmarshal items: %w", err)
		}
		msg := msgConstructor(
			u.synchronizer.SignerAddr,
			uint64(res[0].Height+1),
			targetItems,
			pi.Proofs,
			pi.StoreProof,
			pi.StoreRoot,
		)
		return msg, nil
	})

	return msgs, err
}

type SdkMsg interface {
	MsgSizeInterface
	sdk.Msg
}

func MakeUpdateMsgCompose[T SdkMsg, E any](ctx context.Context, u *UpdateHelper, keys [][]byte, storeKey string, height int64,
	msgConstructor func(signer string, proofHeight uint64, items []E, proofs, storeProof, storeRoot []byte) T) ([]sdk.Msg, error) {
	updateClientMsg, targetHeight, err := u.CreateUpdateClientMsg(ctx, height)
	if err != nil {
		return nil, err
	}
	res, err := u.queryProof(ctx, keys, storeKey, targetHeight)
	if err != nil {
		return nil, err
	}
	msgs, err := CreateUpdateMsgs(u, res, msgConstructor)
	if err != nil {
		return nil, err
	}
	var sdkMsg []sdk.Msg
	sdkMsg = append(sdkMsg, updateClientMsg)
	for _, msg := range msgs {
		sdkMsg = append(sdkMsg, msg)
	}
	return sdkMsg, nil
}

func CreateUpdateDidMsgs(ctx context.Context, u *UpdateHelper, addresses, dids []string) error {
	return u.synchronizer.UpdateKYCNoDb(ctx, addresses, dids)
}
