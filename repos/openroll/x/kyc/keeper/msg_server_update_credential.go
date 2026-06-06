package keeper

import (
	"bytes"
	"context"

	ics23 "github.com/confio/ics23/go"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/st-chain/rollapp/x/kyc/types"
)

func (k msgServer) UpdateCredential(goCtx context.Context, msg *types.MsgUpdateCredential) (*types.MsgUpdateCredentialResponse, error) {
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
	items := make(map[string][]byte)
	for _, cr := range msg.Credentials {
		items[string(cr.Key)] = cr.Value
	}
	err = k.hubAuthKeeper.BatchVerifyMembership(ctx, msg.ProofHeight, []byte(types.MeHubDidStoreKey), msg.StoreHash, &storeProof, items, &proofs)
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
		var vc types.Credential
		err = vc.Unmarshal(credential.Value)
		if err != nil {
			return nil, err
		}
		k.SetKYCCredential(ctx, types.KYCCredential{
			Did:        string(did),
			Credential: &vc,
		})
	}

	return &types.MsgUpdateCredentialResponse{}, nil
}
