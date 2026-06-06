package keeper

import (
	"context"

	ics23 "github.com/confio/ics23/go"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/st-chain/rollapp/x/region/types"
)

func (k msgServer) UpdateRegion(goCtx context.Context, msg *types.MsgUpdateRegion) (*types.MsgUpdateRegionResponse, error) {
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

	// 2. Create items map
	items := make(map[string][]byte)
	for _, item := range msg.Regions {
		items[string(item.Key)] = item.Value
	}

	// 3. Batch verify membership
	err = k.hubAuthKeeper.BatchVerifyMembership(ctx, msg.ProofHeight, []byte(types.MeHubRegionStoreKey), msg.StoreHash, &storeProof, items, &proofs)
	if err != nil {
		return nil, err
	}

	// 4. Update Region
	for _, item := range msg.Regions {

		// Parse MeHubRegionType
		var meHubRegion types.MeHubRegionType
		err = meHubRegion.Unmarshal(item.Value)
		if err != nil {
			return nil, err
		}

		// Construct Region object
		region := types.Region{
			RegionId:           meHubRegion.RegionId,
			OperatorAddress:    meHubRegion.OperatorAddress,
			RegionTreasureAddr: meHubRegion.RegionTreasureAddr,
		}

		//create account for operator and Treasure if not exist
		oValAddr, err := sdk.ValAddressFromBech32(meHubRegion.OperatorAddress)
		if err != nil {
			return nil, err
		}
		oAccAddr := sdk.AccAddress(oValAddr)
		if found := k.accountKeeper.HasAccount(ctx, oAccAddr); !found {
			acc := k.accountKeeper.NewAccountWithAddress(ctx, oAccAddr)
			k.accountKeeper.SetAccount(ctx, acc)
		}

		rtAccAddr := sdk.MustAccAddressFromBech32(meHubRegion.RegionTreasureAddr)
		if found := k.accountKeeper.HasAccount(ctx, rtAccAddr); !found {
			acc := k.accountKeeper.NewAccountWithAddress(ctx, rtAccAddr)
			k.accountKeeper.SetAccount(ctx, acc)
		}
		// Save Region
		k.SetRegion(ctx, region)
		// Emit event
		ctx.EventManager().EmitEvent(
			sdk.NewEvent(
				types.EventTypeUpdateRegion,
				sdk.NewAttribute(types.AttributeKeyRegionID, region.RegionId),
				sdk.NewAttribute(types.AttributeKeyOperatorAddress, region.OperatorAddress),
				sdk.NewAttribute(types.AttributeKeyRegionTreasureAddr, region.RegionTreasureAddr),
			),
		)
	}

	return &types.MsgUpdateRegionResponse{}, nil
}
