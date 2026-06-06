package keeper

import (
	"strings"

	ics23 "github.com/confio/ics23/go"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	transferTypes "github.com/cosmos/ibc-go/v6/modules/apps/transfer/types"
	commitmenttypes "github.com/cosmos/ibc-go/v6/modules/core/23-commitment/types"
	tmtypes "github.com/cosmos/ibc-go/v6/modules/light-clients/07-tendermint/types"
	"github.com/st-chain/rollapp/x/hubauth/types"
)

func (k Keeper) VerifyMembership(ctx sdk.Context, ProofHeight uint64, path commitmenttypes.MerklePath, proof []byte, value []byte) error {
	clientID := k.ClientId(ctx)
	cs, ok := k.clientKeeper.GetClientState(ctx, clientID)
	if !ok {
		return types.ErrClientStateNotFound
	}

	//make sure proofHeight == clientStateLatestHeight
	exportHeight := cs.GetLatestHeight()
	h := exportHeight.GetRevisionHeight()
	if ProofHeight != h {
		return sdkerrors.Wrapf(types.ErrInvalidProofHeight, "proofHeight:%d != clientStateLatestHeight:%d", ProofHeight, h)
	}

	consensusState, ok := k.clientKeeper.GetClientConsensusState(ctx, clientID, exportHeight)
	if !ok {
		return types.ErrConsensusStateNotFound
	}
	tmClientState, ok := cs.(*tmtypes.ClientState)
	if !ok {
		return types.ErrInvalidClientState
	}
	var merkleProof commitmenttypes.MerkleProof
	err := k.cdc.Unmarshal(proof, &merkleProof)
	if err != nil {
		return types.ErrInvalidMerkleProof
	}
	err = merkleProof.VerifyMembership(tmClientState.ProofSpecs, consensusState.GetRoot(), path, value)
	if err != nil {
		return sdkerrors.Wrap(types.ErrVerifyMembershipFailed, err.Error())
	}
	return nil
}

func (k Keeper) BatchVerifyMembership(ctx sdk.Context, ProofHeight uint64, storeKey []byte, storeValue []byte, storeProof *ics23.CommitmentProof, items map[string][]byte, proofs *ics23.CommitmentProof) error {
	clientID := k.ClientId(ctx)
	cs, ok := k.clientKeeper.GetClientState(ctx, clientID)
	if !ok {
		return types.ErrClientStateNotFound
	}

	//make sure proofHeight == clientStateLatestHeight
	exportHeight := cs.GetLatestHeight()
	h := exportHeight.GetRevisionHeight()
	if ProofHeight != h {
		return sdkerrors.Wrapf(types.ErrInvalidProofHeight, "proofHeight:%d != clientStateLatestHeight:%d", ProofHeight, h)
	}

	consensusState, ok := k.clientKeeper.GetClientConsensusState(ctx, clientID, exportHeight)
	if !ok {
		return types.ErrConsensusStateNotFound
	}
	tmClientState, ok := cs.(*tmtypes.ClientState)
	if !ok {
		return types.ErrInvalidClientState
	}

	//verify store key
	ok = ics23.VerifyMembership(tmClientState.ProofSpecs[1], consensusState.GetRoot().GetHash(), storeProof, storeKey, storeValue)
	if !ok {
		return types.ErrVerifyStoreProofFailed
	}

	//verify members
	ok = ics23.BatchVerifyMembership(tmClientState.ProofSpecs[0], storeValue, proofs, items)
	if !ok {
		return types.ErrVerifyMemberProofFailed
	}
	return nil
}

func (k Keeper) BatchVerifyNonMembership(ctx sdk.Context, ProofHeight uint64, storeKey []byte, storeValue []byte, storeProof *ics23.CommitmentProof, items [][]byte, proofs *ics23.CommitmentProof) error {
	clientID := k.ClientId(ctx)
	cs, ok := k.clientKeeper.GetClientState(ctx, clientID)
	if !ok {
		return types.ErrClientStateNotFound
	}

	//make sure proofHeight == clientStateLatestHeight
	exportHeight := cs.GetLatestHeight()
	h := exportHeight.GetRevisionHeight()
	if ProofHeight != h {
		return sdkerrors.Wrapf(types.ErrInvalidProofHeight, "proofHeight:%d != clientStateLatestHeight:%d", ProofHeight, h)
	}

	consensusState, ok := k.clientKeeper.GetClientConsensusState(ctx, clientID, exportHeight)
	if !ok {
		return types.ErrConsensusStateNotFound
	}
	tmClientState, ok := cs.(*tmtypes.ClientState)
	if !ok {
		return types.ErrInvalidClientState
	}

	//verify store key
	ok = ics23.VerifyMembership(tmClientState.ProofSpecs[1], consensusState.GetRoot().GetHash(), storeProof, storeKey, storeValue)
	if !ok {
		return types.ErrVerifyStoreProofFailed
	}

	//verify members
	ok = ics23.BatchVerifyNonMembership(tmClientState.ProofSpecs[0], storeValue, proofs, items)
	if !ok {
		return types.ErrVerifyMemberProofFailed
	}
	return nil
}

func (k Keeper) VerifyIBCDenomFromHub(ctx sdk.Context, denom string) (bool, error) {
	if !strings.HasPrefix(denom, transferTypes.DenomPrefix) {
		return false, nil
	}
	hexHash := denom[len(transferTypes.DenomPrefix+"/"):]

	hash, err := transferTypes.ParseHexHash(hexHash)
	if err != nil {
		return false, sdkerrors.Wrap(transferTypes.ErrInvalidDenomForTransfer, err.Error())
	}

	denomTrace, found := k.ibcTransferKeeper.GetDenomTrace(ctx, hash)
	if !found {
		return false, sdkerrors.Wrap(transferTypes.ErrTraceNotFound, hexHash)
	}
	//denomTrace.BaseDenom != types.HubDenom
	if denomTrace.BaseDenom != types.HubBaseDenom {
		return false, nil
	}
	//split port and channel
	path := strings.Split(denomTrace.Path, "/")
	if len(path) != 2 {
		return false, sdkerrors.Wrap(transferTypes.ErrInvalidDenomForTransfer, "invalid path")
	}
	port := path[0]
	channel := path[1]
	_, client, err := k.channelKeeper.GetChannelConnection(ctx, port, channel)
	if err != nil {
		return false, err
	}
	if client.GetClientID() == k.ClientId(ctx) {
		return true, nil
	} else {
		denomPath := k.DenomPath(ctx)
		denomRealPath := denomTrace.GetPath() + "/" + denomTrace.GetBaseDenom()
		k.Logger(ctx).Info("denom path: ", "params", denomPath, "coin path", denomRealPath)
		return denomRealPath == denomPath, nil
	}
}
