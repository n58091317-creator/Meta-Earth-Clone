package layer1

import (
	"context"
	"fmt"
	"time"

	//ctypes "github.com/cometbft/cometbft/rpc/core/types"
	cmtypes "github.com/cometbft/cometbft/types"
)

func (s *Synchronizer) ListenEventOnHub(ctx context.Context) error {
	eventCh, err := s.meClient.Subscribe(ctx, "eventSub", "kyc_event.action EXISTS", 1024)
	if err != nil {
		return fmt.Errorf("subscribe event error:%v", err)
	}
	defer s.meClient.Unsubscribe(ctx, "eventSub", "kyc_event.action EXISTS")

	//collect did and address need to update to rollApp
	log.Info("start listen event on hub")
	timeout := time.NewTicker(time.Second * 600)
	for {
		timeout.Reset(time.Second * 600)
		select {
		case <-ctx.Done():

			return fmt.Errorf("ListenEventOnHub error, ctx done:%v", ctx.Err())
		case event, ok := <-eventCh:
			if !ok {

				return fmt.Errorf("ListenEventOnHub error, eventCh close")
			}
			DataInTx, ok := event.Data.(cmtypes.EventDataTx)
			if !ok {
				log.Error("event data is not a tx")
				continue
			}
			log.Info("catch event from me-hub", "TX", event.Events["tx.hash"], "Hub-Height", DataInTx.Height, "Tx-Code", DataInTx.Result.GetCode())
			err = s.CollectEvent(ctx, event)
			if err != nil {
				log.Error(err.Error())
				time.Sleep(3 * time.Second)
			}
		case <-timeout.C:
			log.Info("timeout to listen event on hub")
			return nil
		}
	}
}

func (s *Synchronizer) listenHubBlock(ctx context.Context) error {
	nextBlock, err := s.meClient.Subscribe(ctx, "blockSub", "tm.event='NewBlock'", 1024)
	if err != nil {
		return fmt.Errorf("subscribe event for NewBlock error:%v", err)
	}
	defer s.meClient.Unsubscribe(ctx, "blockSub", "tm.event='NewBlock'")
	log.Info("start listen block on hub")
	timeout := time.NewTicker(time.Second * 60)
	for {
		timeout.Reset(time.Second * 60)
		select {
		case <-ctx.Done():

			return fmt.Errorf("listenHubBlock error, ctx done:%v", ctx.Err())
		case hubBlockEvent, ok := <-nextBlock:
			if !ok {
				return fmt.Errorf("listenHubBlock error, nextBlock close")
			}
			eventData, ok := hubBlockEvent.Data.(cmtypes.EventDataNewBlock)
			if !ok {
				return fmt.Errorf("hubBlockEvent error, event data is not a NewBlock")
			}
			log.Info("catch new block event from me-hub", "height", eventData.Block.Height)
			select {
			case s.nextHubBlockNotify <- eventData.Block.Height:
			default:
			}
		case <-timeout.C:
			log.Error("timeout to listen block on hub")
			return fmt.Errorf("timeout to listen block on hub")
		}
	}
}
