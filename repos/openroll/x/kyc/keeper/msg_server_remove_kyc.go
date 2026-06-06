package keeper

import (
	"bytes"
	"context"

	ics23 "github.com/confio/ics23/go"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/st-chain/rollapp/x/kyc/types"
)

func (k msgServer) RemoveKyc(goCtx context.Context, msg *types.MsgRemoveKyc) (*types.MsgRemoveKycResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	storeProof := ics23.CommitmentProof{}
	err := k.cdc.Unmarshal(msg.StoreProof, &storeProof)
	if err != nil {
		return nil, types.ErrInvalidMerkleProof
	}

	proofs := ics23.CommitmentProof{}
	err = k.cdc.Unmarshal(msg.Proofs, &proofs)
	if err != nil {
		return nil, types.ErrInvalidMerkleProof
	}
	//create item map
	items := make([][]byte, 0)
	for _, cr := range msg.Credentials {
		items = append(items, cr.Key)
	}
	err = k.hubAuthKeeper.BatchVerifyNonMembership(ctx, msg.ProofHeight, []byte(types.MeHubDidStoreKey), msg.StoreHash, &storeProof, items, &proofs)
	if err != nil {
		return nil, err
	}

	//set credential

	for _, credential := range msg.Credentials {
		cutPrefix, found := bytes.CutPrefix([]byte(credential.Key), types.MeHUbCredentialPrefix)
		if !found {
			return nil, types.ErrInvalidItem
		}
		did, found := bytes.CutSuffix(cutPrefix, []byte("kyc"))
		if !found {
			return nil, types.ErrInvalidItem
		}
		k.RemoveKYCCredential(ctx, string(did))
		ctx.Logger().Info("remove kyc credential", "did", string(did))
	}

	return &types.MsgRemoveKycResponse{}, nil
}
