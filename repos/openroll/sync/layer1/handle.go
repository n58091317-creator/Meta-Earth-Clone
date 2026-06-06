package layer1

import (
	"context"
	"fmt"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/ibc-go/v6/modules/core/02-client/types"
	"strings"
	"time"

	ctypes "github.com/cometbft/cometbft/rpc/core/types"
)

func (s *Synchronizer) CollectEvent(ctx context.Context, resultEvent ctypes.ResultEvent) error {
	addresses, ok := resultEvent.Events["kyc_event.address"]
	if !ok {
		return fmt.Errorf("address not found in resultEvent %+v", resultEvent.Events)
	}
	for _, addr := range addresses {
		s.WaitUpdateData.Address <- addr
	}

	DIDs, ok := resultEvent.Events["kyc_event.did"]
	if !ok {
		return fmt.Errorf("did not found in resultEvent %+v", resultEvent.Events)
	}

	for _, did := range DIDs {
		s.WaitUpdateData.DID <- did
	}
	return nil
}

func (s *Synchronizer) ProcessUpdateData(ctx context.Context) error {
	var cacheDIDs []string
	var cacheAddress []string
	tick := time.NewTicker(10 * time.Second)
	for {
		select {
		case addr := <-s.WaitUpdateData.Address:
			cacheAddress = append(cacheAddress, addr)
		case did := <-s.WaitUpdateData.DID:
			cacheDIDs = append(cacheDIDs, did)
		case <-tick.C:
			if len(cacheAddress) != 0 || len(cacheDIDs) != 0 {
				log.Debug("time to update data")
				err := s.UpdateKYC(ctx, cacheDIDs, cacheAddress)
				tick.Reset(10 * time.Second)
				if err != nil {
					log.Error("failed to update kyc", "err", err)
					continue
				}
				cacheDIDs, cacheAddress = []string{}, []string{}
			}
		}
		if len(cacheAddress)+len(cacheDIDs) >= 10 {
			err := s.UpdateKYC(ctx, cacheDIDs, cacheAddress)
			tick.Reset(10 * time.Second)
			if err != nil {
				log.Error("failed to update kyc", "err", err)
				continue
			}
			cacheDIDs, cacheAddress = []string{}, []string{}
		}
	}
}

func (s *Synchronizer) UpdateKYC(ctx context.Context, DIDs []string, addresses []string) error {
	s.lightClientUpdating <- struct{}{}
	defer func() {
		<-s.lightClientUpdating
	}()
	msgs, targetHeight, err := s.createUpdateMsgs(ctx, DIDs, addresses)
	if err != nil {
		return fmt.Errorf("failed to create update msgs: %w", err)
	}

	res, err := s.TxSender(msgs...)
	if err != nil || res.Code != 0 {
		return fmt.Errorf("failed to send tx: %v res:%+v ", err, res)
	}

	if res.Code != 0 {
		return fmt.Errorf("failed to update kyc: %s", res.RawLog)
	}
	log.Info("exec update kyc tx success", "hash", res.TxHash, "code", res.Code)
	//save to db
	return s.db.SaveUpdateStatus(DIDs, addresses, targetHeight)
}

func (s *Synchronizer) UpdateKYCNoDb(ctx context.Context, addresses, dids []string) error {
	log.Info("update kyc", "count", len(addresses), "addresses", strings.Join(addresses, ","))
	msgs, _, err := s.CreateUpdateMsgsNoDb(ctx, addresses, dids)
	if err != nil {
		return fmt.Errorf("failed to create update msgs: %w", err)
	}
	if len(msgs) == 1 {
		if strings.Contains(msgs[0].String(), "MsgUpdateClient") {
			return nil
		}
	}
	res, err := s.TxSender(msgs...)
	if err != nil {
		return fmt.Errorf("failed to send tx: %w res:%+v", err, res)
	}
	if res.Code != 0 {
		return fmt.Errorf("failed to update kyc: %s", res.RawLog)
	}
	log.Info("exec update kyc tx success", "hash", res.TxHash, "code", res.Code)
	return nil
}

func (s *Synchronizer) CreateUpdateMsgsNoDb(ctx context.Context, addresses, dids []string) ([]sdk.Msg, int64, error) {
	var updateMsgs []sdk.Msg
	//create gea-hub light client state update msg
	updateClientMsg, targetHeight, err := s.createUpdateClientMsgNoDb(ctx)
	if err != nil {
		return nil, 0, err
	}
	if updateClientMsg != nil {
		updateMsgs = append(updateMsgs, updateClientMsg)
		log.Info("create update client msg", "targetHeight", targetHeight)
	}

	if len(addresses) > 0 && targetHeight > 0 {
		credentialUpdateMsg, err := s.CreateDIDProofMsgAtHeight(ctx, addresses, targetHeight)
		if err != nil {
			return nil, 0, err
		}
		updateMsgs = append(updateMsgs, credentialUpdateMsg...)
	}
	if len(dids) > 0 {
		credentialUpdateMsg, err := s.CreateCredentialProofMsgAtHeight(ctx, dids, targetHeight)
		if err != nil {
			return nil, 0, err
		}
		updateMsgs = append(updateMsgs, credentialUpdateMsg...)
	}
	return updateMsgs, targetHeight, nil
}

func (s *Synchronizer) createUpdateClientMsgNoDb(ctx context.Context) (sdk.Msg, int64, error) {
	targetHeader, _, err := s.QueryHubHeader(ctx, 0)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query update header: %w", err)
	}
	//get trusted header for light client
	trustedHeader, csHeight, err := s.QueryTrustedHeader(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query trusted header: %w", err)
	}
	targetHeader.TrustedHeight = csHeight.(types.Height)
	targetHeader.TrustedValidators = trustedHeader.ValidatorSet
	msg, err := types.NewMsgUpdateClient(s.MeClientID, &targetHeader, s.SignerAddr)
	return msg, targetHeader.Header.Height, err

}
