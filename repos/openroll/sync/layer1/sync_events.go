package layer1

import (
	"context"
	"fmt"
	"sort"
)

const upgradeHeight = 6624500

func (s *Synchronizer) SyncKycEvents(ctx context.Context) error {
	targetHeight, err := s.getTargetHeight(ctx)
	if err != nil {
		return err
	}

	log.Info("start to sync kyc events", "targetHeight", targetHeight)

	ks, err := s.initializeLatestSequence()
	if err != nil {
		return err
	}

	if ks.Height < upgradeHeight {
		ks.Height = upgradeHeight
	}
	return s.processEventsInBatches(ctx, targetHeight, ks)
}

func (s *Synchronizer) getTargetHeight(ctx context.Context) (int64, error) {
	header, err := s.meClient.Header(ctx, nil)
	if err != nil {
		return 0, err
	}
	targetHeight := header.Header.Height
	if targetHeight < 1 {
		targetHeight = 1
	}
	return targetHeight, nil
}

func (s *Synchronizer) initializeLatestSequence() (*Sequence, error) {
	ks, err := s.db.GetLatestSequence()
	if err != nil {
		return nil, fmt.Errorf("GetLatestSequence: %w", err)
	}
	if ks == nil {
		ks = &Sequence{Seq: 0, Height: upgradeHeight}
		if err := s.db.UpdateLatestSequence(ks.Seq, ks.Height); err != nil {
			return nil, err
		}
	}
	return ks, nil
}

func (s *Synchronizer) processEventsInBatches(ctx context.Context, targetHeight int64, ks *Sequence) error {
	var endHeight int64
	for startHeight := ks.Height; startHeight < targetHeight; {
		endHeight = startHeight + 1000
		if endHeight > targetHeight {
			endHeight = targetHeight
		}
		log.Info("process events", "from", startHeight, "to", endHeight)

		if err := s.processBatch(ctx, startHeight, endHeight); err != nil {
			return err
		}

		startHeight = endHeight
	}
	return nil
}

func (s *Synchronizer) processBatch(ctx context.Context, startHeight, endHeight int64) error {
	ks, err := s.db.GetLatestSequence()
	if err != nil {
		return fmt.Errorf("GetLatestSequence: %w", err)
	}
	next, err := s.QueryKycEvents(ctx, startHeight, endHeight, ks.Seq, 1, 100)
	if err != nil {
		return fmt.Errorf("QueryKycEvents: %w", err)
	}
	pendingEvents := make([]*KycEvent, 0)
	for {
		txR, err := next()
		if err != nil {
			return fmt.Errorf("QueryKycEvents: %w", err)
		}
		if txR == nil {
			break
		}

		events, err := getKycEventFromTx(txR.Txs)
		if err != nil {
			return fmt.Errorf("getKycEventFromTx: %w", err)
		}
		pendingEvents = append(pendingEvents, events...)
	}
	if len(pendingEvents) == 0 {
		//for avoid redundant call QueryKycEvents from same startHeight
		return s.db.UpdateLatestSequence(ks.Seq, endHeight)
	}
	if err := s.validateAndProcessEvents(ctx, pendingEvents); err != nil {
		return err
	}
	return nil
}

func (s *Synchronizer) validateAndProcessEvents(ctx context.Context, events []*KycEvent) error {
	if len(events) == 0 {
		return nil
	}
	sort.Slice(events, func(i, j int) bool {
		return events[i].seq < events[j].seq
	})
	ks, err := s.db.GetLatestSequence()
	if err != nil {
		return fmt.Errorf("GetLatestSequence: %w", err)
	}
	if ks.Seq+1 < events[0].seq {
		return fmt.Errorf("sequence continuity check failed current: %d, event: %d", ks.Seq, events[0].seq)
	}

	if !checkSequenceContinuity(events) {
		return s.reportSequenceDiscontinuity(events)
	}

	if err := s.ProcessKycEvents(ctx, events); err != nil {
		return fmt.Errorf("ProcessKycEvents: %w", err)
	}

	return nil
}

func (s *Synchronizer) reportSequenceDiscontinuity(events []*KycEvent) error {
	var sequences []int64
	for _, v := range events {
		sequences = append(sequences, v.seq)
	}
	return fmt.Errorf("sequence continuity check failed sequences: %v", sequences)
}
