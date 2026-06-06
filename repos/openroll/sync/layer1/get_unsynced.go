package layer1

import (
	"fmt"
	"github.com/st-chain/rollapp/sync/hubclient"
	hubclienttypes "github.com/st-chain/rollapp/sync/hubclient/types"
	"github.com/st-chain/rollapp/sync/rollapp_grpc"
	kyctypes "github.com/st-chain/rollapp/x/kyc/types"
)

func GetUnsyncedAddresses(hubGrpc *hubclient.Client, rollappGrpc *rollapp_grpc.Client) ([]string, []string, error) {
	hubDidInfos, _, err := hubGrpc.GetAllDidInfos()
	if err != nil {
		return nil, nil, fmt.Errorf("grpc sync from hub, get all did: %w", err)
	}

	rollappDidInfos, _, err := rollappGrpc.QueryAllDidInfo()
	if err != nil {
		return nil, nil, fmt.Errorf("grpc sync from rollapp, get all did: %w", err)
	}

	rollappDidInfoMap := make(map[string]kyctypes.DidInfo)
	for _, rollappDid := range rollappDidInfos {
		rollappDidInfoMap[rollappDid.Address] = rollappDid
	}

	hubDidInfoMap := make(map[string]hubclienttypes.DidInfo)
	for _, didInfo := range hubDidInfos {
		hubDidInfoMap[didInfo.Address] = didInfo
	}

	unSyncAddress := []string{}
	unSyncDids := []string{}
	for _, hubDid := range hubDidInfos {
		if _, ok := rollappDidInfoMap[hubDid.Address]; !ok {
			unSyncAddress = append(unSyncAddress, hubDid.Address)
			unSyncDids = append(unSyncDids, hubDid.Did)
		}
	}

	rmSyncAddress := []string{}
	rmSyncDids := []string{}
	for _, didInfo := range rollappDidInfos {
		if _, ok := hubDidInfoMap[didInfo.Address]; !ok {
			rmSyncAddress = append(rmSyncAddress, didInfo.Address)
			rmSyncDids = append(rmSyncDids, didInfo.Did)
		}
	}

	log.Info("grpc sync kyc, get total did in Hub", "length", len(hubDidInfos))
	log.Info("grpc sync kyc, get total did in Rollapp", "length", len(rollappDidInfos))
	log.Info("grpc sync kyc, get total address unsync", "length", len(unSyncAddress))
	log.Info("grpc sync kyc, get total address need remove", "length", len(rmSyncAddress))
	log.Info("grpc sync kyc, get total did unsync", "length", len(unSyncDids))
	log.Info("grpc sync kyc, get total did need remove", "length", len(rmSyncDids))
	if len(rollappDidInfos) > len(hubDidInfos) {
		return nil, nil, fmt.Errorf("rollapp did number larger than hub")
	}
	return append(unSyncAddress, rmSyncAddress...), append(unSyncDids, rmSyncDids...), nil
}
