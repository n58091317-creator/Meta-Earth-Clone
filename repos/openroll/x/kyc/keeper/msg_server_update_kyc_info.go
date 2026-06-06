package keeper

import (
	"context"

	ics23 "github.com/confio/ics23/go"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/st-chain/rollapp/x/kyc/types"
)

func (k msgServer) UpdateKycInfo(goCtx context.Context, msg *types.MsgUpdateKycInfo) (*types.MsgUpdateKycInfoResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)
	if len(msg.Proofs) == 0 || len(msg.DidInfos) == 0 {
		return nil, types.ErrInvalidUpdateInfo
	}

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

	// create item map
	items := make(map[string][]byte)
	for _, didInfo := range msg.DidInfos {
		items[string(didInfo.Key)] = didInfo.Value
	}

	err = k.hubAuthKeeper.BatchVerifyMembership(ctx, msg.ProofHeight, []byte(types.MeHubDidStoreKey), msg.StoreHash, &storeProof, items, &proofs)
	if err != nil {
		return nil, err
	}

	// set kycInfo
	for _, di := range msg.DidInfos {

		var didInfo types.DidInfo
		err = didInfo.Unmarshal(di.Value)
		if err != nil {
			return nil, err
		}
		// create account if not found
		didAcc := sdk.MustAccAddressFromBech32(didInfo.Address)
		if found := k.accountKeeper.HasAccount(ctx, didAcc); !found {
			acc := k.accountKeeper.NewAccountWithAddress(ctx, didAcc)
			k.accountKeeper.SetAccount(ctx, acc)
		}
		k.SetDidInfo(ctx, didInfo)
	}

	return &types.MsgUpdateKycInfoResponse{}, nil
}
