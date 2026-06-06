package keeper

import (
	"bytes"
	"context"
	"strings"

	ics23 "github.com/confio/ics23/go"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/st-chain/rollapp/x/region/types"
)

func (k msgServer) RemoveRegion(goCtx context.Context, msg *types.MsgRemoveRegion) (*types.MsgRemoveRegionResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// 1. Verify proof
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

	// 2. Create items array
	items := make([][]byte, 0)
	for _, region := range msg.Regions {
		items = append(items, region.Key)
	}

	// 3. Batch verify non-membership
	err = k.hubAuthKeeper.BatchVerifyNonMembership(ctx, msg.ProofHeight, []byte(types.MeHubRegionStoreKey), msg.StoreHash, &storeProof, items, &proofs)
	if err != nil {
		return nil, err
	}

	// 4. Remove Region
	for _, region := range msg.Regions {
		// Check prefix
		cutPrefix, found := bytes.CutPrefix([]byte(region.Key), types.MeHubRegionPrefix)
		if !found {
			return nil, types.ErrInvalidItem
		}

		// Parse regionId
		regionId, _ := strings.CutSuffix(string(cutPrefix), "/")

		// Remove Region
		k.Keeper.RemoveRegion(ctx, regionId)
		ctx.Logger().Info("remove region", "regionId", regionId)
		// Emit event
		ctx.EventManager().EmitEvent(
			sdk.NewEvent(
				types.EventTypeRemoveRegion,
				sdk.NewAttribute(types.AttributeKeyRegionID, regionId),
			),
		)
	}

	return &types.MsgRemoveRegionResponse{}, nil
}
