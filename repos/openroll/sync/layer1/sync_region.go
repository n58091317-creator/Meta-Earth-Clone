package layer1

import (
	"context"
	"fmt"
	"time"

	"github.com/cosmos/cosmos-sdk/types/query"
	"github.com/st-chain/rollapp/x/region/types"
	regionTypes "github.com/st-chain/rollapp/x/region/types"
)

func (s *Synchronizer) RegionSync(ctx context.Context) {
	regionsCache := make(map[string]*regionTypes.Region)
	fetchMeRegion := time.NewTicker(60 * time.Second)
	fetchRollappTicker := time.NewTicker(300 * time.Second)

	helper := NewUpdateHelperFromSynchronizer(s)

	for {
		select {
		case <-fetchMeRegion.C:
			log.Info("start to sync region")
			meRegions, err := s.getAllMeRegions(ctx, 0)
			if err != nil {
				log.Error("failed to get all me regions", "err", err)
				continue
			}

			if len(regionsCache) == 0 {
				regions, err := s.queryRollappRegions(ctx)
				if err != nil {
					log.Error("failed to query rollapp regions", "err", err)
					continue
				}
				for _, region := range regions {
					regionsCache[region.RegionId] = &region
				}
			}
			needUpdateRegionID, err := s.filterChangeRegions(meRegions, regionsCache)
			if err != nil {
				log.Error("failed to filter change regions", "err", err)
				continue
			}
			if len(needUpdateRegionID) != 0 {
				err := s.updateRegions(ctx, helper, needUpdateRegionID)
				if err != nil {
					log.Error("failed to update regions", "err", err)
					continue
				}
			}
			needRemoveRegionID, err := s.filterRemovedRegions(meRegions, regionsCache)
			if err != nil {
				log.Error("failed to filter removed regions", "err", err)
				continue
			}
			if len(needRemoveRegionID) != 0 {
				err := s.removeRegions(ctx, helper, needRemoveRegionID)
				if err != nil {
					log.Error("failed to remove regions", "err", err)
					continue
				}
			}
			log.Info("sync region done", "update", len(needUpdateRegionID), "remove", len(needRemoveRegionID))
			//reset regionsCache
			regionsCache = make(map[string]*regionTypes.Region)

		case <-fetchRollappTicker.C:
			regions, err := s.queryRollappRegions(ctx)
			if err != nil {
				continue
			}
			regionsCache = make(map[string]*regionTypes.Region)
			for _, region := range regions {
				if region.OperatorAddress == "" {
					continue
				}
				regionsCache[region.RegionId] = &region
			}
		case <-ctx.Done():
			log.Logger.Warn("RegionSync exit", "err", ctx.Err())
			return
		}
	}
}

func (s *Synchronizer) getAllMeRegions(ctx context.Context, height int64) ([]regionTypes.MeHubRegionType, error) {
	req := regionTypes.QueryMeAllRegionRequest{}
	var regions []regionTypes.MeHubRegionType
	for {
		res, _, err := s.queryMeRegions(ctx, height, req)
		if err != nil {
			return nil, err
		}
		//remove empty regions
		for _, region := range res.Region {
			if region.RegionId == "" {
				continue
			}
			if region.OperatorAddress == "" {
				continue
			}
			regions = append(regions, region)
		}

		//regions = append(regions, res.Region...)
		if res.Pagination == nil || len(res.Pagination.NextKey) == 0 {
			break
		}
		req = regionTypes.QueryMeAllRegionRequest{
			Pagination: &query.PageRequest{
				Key: res.Pagination.GetNextKey(),
			},
		}
	}
	return regions, nil
}

func (s *Synchronizer) filterChangeRegions(regions []regionTypes.MeHubRegionType, rollappRegions map[string]*regionTypes.Region) ([][]byte, error) {
	var needUpdate [][]byte
	for _, region := range regions {
		if rollappRegion, ok := rollappRegions[region.RegionId]; ok {
			if region.OperatorAddress != rollappRegion.OperatorAddress {
				needUpdate = append(needUpdate, []byte(region.RegionId))
			}
		} else {
			needUpdate = append(needUpdate, []byte(region.RegionId))
		}
	}
	//add key prefix and suffix for region id
	for i := range needUpdate {
		needUpdate[i] = append(regionTypes.MeHubRegionPrefix, needUpdate[i]...)
		needUpdate[i] = append(needUpdate[i], []byte("/")...)
	}
	return needUpdate, nil
}
func (s *Synchronizer) filterRemovedRegions(regions []regionTypes.MeHubRegionType, rollappRegions map[string]*regionTypes.Region) ([][]byte, error) {
	var needRemove [][]byte
	meHubRegionID := make(map[string]struct{})
	for _, region := range regions {
		meHubRegionID[region.RegionId] = struct{}{}
	}
	for id := range rollappRegions {
		if _, ok := meHubRegionID[id]; !ok {
			needRemove = append(needRemove, []byte(id))

		}
	}
	//add key prefix and suffix for region id
	for i := range needRemove {
		needRemove[i] = append(regionTypes.MeHubRegionPrefix, needRemove[i]...)
		needRemove[i] = append(needRemove[i], []byte("/")...)
	}
	return needRemove, nil
}

func (s *Synchronizer) updateRegions(ctx context.Context, helper *UpdateHelper, needUpdateRegionID [][]byte) error {
	s.lightClientUpdating <- struct{}{}
	defer func() {
		<-s.lightClientUpdating
	}()
	msgConstructor := func(signer string, proofHeight uint64, items []*types.Item, proofs, storeProof, storeRoot []byte) *types.MsgUpdateRegion {
		msg := types.NewMsgUpdateRegion(
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
	msgs, err := MakeUpdateMsgCompose(ctx, helper, needUpdateRegionID, "staking", 0, msgConstructor)
	if err != nil {

		return fmt.Errorf("failed to make update msg compose: %w", err)
	}
	for _, msg := range msgs {
		err := msg.ValidateBasic()
		if err != nil {
			return fmt.Errorf("failed to validate basic: %w", err)
		}
	}
	res, err := s.TxSender(msgs...)
	if err != nil {
		return fmt.Errorf("failed to send tx: err: %v res:%v", err, res)
	}
	if res.Code != 0 {
		return fmt.Errorf("failed to update region: %s", res.RawLog)
	}
	log.Info("exec update region tx success", "hash", res.TxHash, "code", res.Code)
	return nil
}

func (s *Synchronizer) removeRegions(ctx context.Context, helper *UpdateHelper, needRemoveRegionID [][]byte) error {
	s.lightClientUpdating <- struct{}{}
	defer func() {
		<-s.lightClientUpdating
	}()
	msgConstructor := func(signer string, proofHeight uint64, items []*types.Item, proofs, storeProof, storeRoot []byte) *types.MsgRemoveRegion {
		msg := types.NewMsgRemoveRegion(
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
	msgs, err := MakeUpdateMsgCompose(ctx, helper, needRemoveRegionID, "staking", 0, msgConstructor)
	if err != nil {

		return fmt.Errorf("failed to make update msg compose: %w", err)
	}
	for _, msg := range msgs {
		err := msg.ValidateBasic()
		if err != nil {
			return fmt.Errorf("failed to validate basic: %w", err)
		}
	}
	res, err := s.TxSender(msgs...)
	if err != nil {
		return fmt.Errorf("failed to send tx: err: %w res:%v", err, res)
	}
	if res.Code != 0 {
		return fmt.Errorf("failed to update region: %s", res.RawLog)
	}
	log.Info("exec update region tx success", "hash", res.TxHash, "code", res.Code)
	return nil
}
