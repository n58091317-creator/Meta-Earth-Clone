package layer1

import (
	"context"
	"fmt"

	abci "github.com/cometbft/cometbft/abci/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	stakingTypes "github.com/cosmos/cosmos-sdk/x/staking/types"
	"github.com/cosmos/ibc-go/v6/modules/core/02-client/types"
	commitmenttypes "github.com/cosmos/ibc-go/v6/modules/core/23-commitment/types"
	tmtypes "github.com/cosmos/ibc-go/v6/modules/light-clients/07-tendermint/types"
	kyctypes "github.com/st-chain/rollapp/x/kyc/types"
)

func (s *Synchronizer) CreateDIDProofMsgAtHeight(ctx context.Context, address []string, height int64) ([]sdk.Msg, error) {
	res, err := s.QueryDIDWithProof(ctx, address, height)
	if err != nil {
		return nil, fmt.Errorf("failed to query did with proof: %w", err)
	}
	//filter nil res.value
	var haveValue []*abci.ResponseQuery
	for _, rv := range res {
		if len(rv.Value) == 0 {
			continue
		}
		haveValue = append(haveValue, rv)
	}
	didUpdateMsg, err := s.CreateUpdateDidMsg(haveValue)
	if err != nil {
		return nil, fmt.Errorf("failed to create update did msg: %w", err)
	}
	return didUpdateMsg, nil
}

func (s *Synchronizer) CreateCredentialProofMsgAtHeight(ctx context.Context, did []string, height int64) ([]sdk.Msg, error) {
	res, err := s.QueryCredentialWithProof(ctx, did, height)
	if err != nil {
		return nil, fmt.Errorf("failed to query credential with proof: %w", err)
	}
	vcUpdateMsg, err := s.CreateUpdateCredentialMsg(res)
	if err != nil {
		return nil, fmt.Errorf("failed to create update credential msg: %w", err)
	}
	helper := NewUpdateHelperFromSynchronizer(s)
	var didInfoKeys [][]byte
	for _, d := range did {
		k := append(kyctypes.MeHubDIDInfoPrefix, []byte(d)...)
		didInfoKeys = append(didInfoKeys, k)
	}
	proofs, err := helper.queryProof(ctx, didInfoKeys, "did", height)
	if err != nil {
		return nil, fmt.Errorf("failed to query did info proof: %w", err)
	}

	updateDidInfoMsgs, err := CreateUpdateMsgs(helper, proofs, updateDidInfosMsgConstructor)
	if err != nil {
		return nil, fmt.Errorf("failed to create update did info msg: %w", err)
	}
	for _, msg := range updateDidInfoMsgs {
		vcUpdateMsg = append(vcUpdateMsg, msg)
	}
	return vcUpdateMsg, nil
}

func updateDidInfosMsgConstructor(signer string, proofHeight uint64, items []*kyctypes.Item, proofs, storeProof, storeRoot []byte) *kyctypes.MsgUpdateKycInfo {
	msg := kyctypes.NewMsgUpdateKycInfo(
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

func (s *Synchronizer) createUpdateClientMsg(ctx context.Context) (sdk.Msg, int64, error) {
	height := <-s.nextHubBlockNotify
	//wait 1 block
	<-s.nextHubBlockNotify

	targetHeader, _, err := s.QueryHubHeader(ctx, height)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query update header: %w", err)
	}
	//get trusted header for light client
	trustedHeader, csHeight, err := s.QueryTrustedHeader(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query trusted header: %w", err)
	}
	targetHeader.TrustedHeight = csHeight.(types.Height)
	targetHeader.TrustedValidators = trustedHeader.ValidatorSet
	msg, err := types.NewMsgUpdateClient(s.MeClientID, &targetHeader, s.SignerAddr)
	return msg, targetHeader.Header.Height, err

}

func (s *Synchronizer) createUpdateMsgs(ctx context.Context, DIDs []string, addrs []string) ([]sdk.Msg, int64, error) {
	var updateMsgs []sdk.Msg
	//create me-hub light client state update msg
	updateClientMsg, targetHeight, err := s.createUpdateClientMsg(ctx)
	if err != nil {
		return nil, 0, err
	}
	updateMsgs = append(updateMsgs, updateClientMsg)
	log.Info("create update client msg", "targetHeight", targetHeight)

	//create DID update msg
	if len(addrs) > 0 {
		didUpdateMsg, err := s.CreateDIDProofMsgAtHeight(ctx, addrs, targetHeight)
		if err != nil {
			return nil, 0, err
		}
		updateMsgs = append(updateMsgs, didUpdateMsg...)
	}
	if len(DIDs) > 0 {
		credentialUpdateMsg, err := s.CreateCredentialProofMsgAtHeight(ctx, DIDs, targetHeight)
		if err != nil {
			return nil, 0, err
		}
		updateMsgs = append(updateMsgs, credentialUpdateMsg...)
	}

	return updateMsgs, targetHeight, nil

}

func (s *Synchronizer) CreateClientMsg(ctx context.Context) (sdk.Msg, error) {
	header, _, err := s.QueryHubHeader(ctx, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to query header: %w", err)
	}
	//query unbonding time from hub
	p, _, err := s.queryMeUnbondingTime(ctx, 0, stakingTypes.QueryParamsRequest{})
	if err != nil {
		return nil, fmt.Errorf("failed to query unbonding time: %w", err)
	}

	revisionNumber := types.ParseChainID(header.Header.ChainID)
	clientState := &tmtypes.ClientState{
		ChainId:         header.Header.ChainID,
		TrustLevel:      tmtypes.DefaultTrustLevel,
		ProofSpecs:      commitmenttypes.GetSDKSpecs(),
		UpgradePath:     []string{"upgrade", "upgradedIBCState"},
		TrustingPeriod:  p.GetParams().UnbondingTime / 2,
		UnbondingPeriod: p.GetParams().UnbondingTime,
		MaxClockDrift:   p.GetParams().UnbondingTime,
		FrozenHeight:    types.ZeroHeight(),
		LatestHeight: types.Height{
			RevisionNumber: revisionNumber,
			RevisionHeight: uint64(header.Header.Height),
		},
		AllowUpdateAfterExpiry:       true,
		AllowUpdateAfterMisbehaviour: true,
	}
	msg, err := types.NewMsgCreateClient(clientState, header.ConsensusState(), s.SignerAddr)
	return msg, err
}
