package keeper

import (
	"bytes"
	"context"

	ics23 "github.com/confio/ics23/go"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/st-chain/rollapp/x/kyc/types"
)

func (k msgServer) UpdateDID(goCtx context.Context, msg *types.MsgUpdateDID) (*types.MsgUpdateDIDResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	if len(msg.Proofs) == 0 || len(msg.Dids) == 0 {
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
	//create item map
	items := make(map[string][]byte)
	for _, did := range msg.Dids {
		items[string(did.Key)] = did.Value
	}

	err = k.hubAuthKeeper.BatchVerifyMembership(ctx, msg.ProofHeight, []byte(types.MeHubDidStoreKey), msg.StoreHash, &storeProof, items, &proofs)
	if err != nil {
		return nil, err
	}

	//set did
	for _, did := range msg.Dids {
		accAddr, found := bytes.CutPrefix([]byte(did.Key), types.MeHubDIDPrefix)
		if !found {
			return nil, types.ErrInvalidItem
		}
		address := sdk.MustBech32ifyAddressBytes(sdk.GetConfig().GetBech32AccountAddrPrefix(), accAddr)
		k.SetDid(ctx, types.Did{
			Address: address,
			Did:     string(did.Value),
		})
		//create account if not found
		if found := k.accountKeeper.HasAccount(ctx, accAddr); !found {
			acc := k.accountKeeper.NewAccountWithAddress(ctx, accAddr)
			k.accountKeeper.SetAccount(ctx, acc)
		}
	}

	return &types.MsgUpdateDIDResponse{}, nil
}
