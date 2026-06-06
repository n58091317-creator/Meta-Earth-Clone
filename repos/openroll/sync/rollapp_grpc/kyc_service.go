package rollapp_grpc

import (
	"context"
	"fmt"
	"github.com/cosmos/cosmos-sdk/types/query"
	"github.com/sirupsen/logrus"
	kyctypes "github.com/st-chain/rollapp/x/kyc/types"
	"time"
)

func (cli *Client) GetKycs(limit, page uint64) ([]kyctypes.KYCCredential, uint64, error) {
	resp, err := cli.kycClient.KYCCredentialAll(context.Background(), &kyctypes.QueryAllKYCCredentialRequest{
		Pagination: &query.PageRequest{
			Key:        nil,
			Offset:     page,
			Limit:      limit,
			CountTotal: true,
			Reverse:    false,
		},
	})
	if err != nil {
		return nil, 0, err
	}
	return resp.GetKYCCredential(), resp.Pagination.Total, nil
}

func (cli *Client) GetDidInfos(limit, page uint64) ([]kyctypes.DidInfo, uint64, error) {
	resp, err := cli.kycClient.DidInfoAll(context.Background(), &kyctypes.QueryAllDidInfoRequest{
		Pagination: &query.PageRequest{
			Key:        nil,
			Offset:     page,
			Limit:      limit,
			CountTotal: true,
			Reverse:    false,
		},
	})
	if err != nil {
		return nil, 0, err
	}
	return resp.GetDidInfo(), resp.Pagination.Total, nil
}

func (cli *Client) QueryAllDidInfo() ([]kyctypes.DidInfo, map[string]int, error) {
	var getAccount func([]kyctypes.DidInfo, []byte) ([]kyctypes.DidInfo, error)
	accountExist := make(map[string]bool)
	credentials := []kyctypes.DidInfo{}
	regionCount := make(map[string]int)
	retries := 0
	getAccount = func(accounts []kyctypes.DidInfo, nextKey []byte) ([]kyctypes.DidInfo, error) {
		response, err := cli.kycClient.DidInfoAll(context.Background(), &kyctypes.QueryAllDidInfoRequest{
			Pagination: &query.PageRequest{
				Limit: 200,
				Key:   nextKey,
			}})
		if err != nil {
			logrus.Error("grpc sync kyc(query kyc)", "error", err)
			if retries < 10 {
				retries++
				time.Sleep(time.Second)
				return getAccount(accounts, nextKey)
			}
			return accounts, err
		}
		for _, m := range response.DidInfo {
			if _, ok := accountExist[m.Did]; ok {
				continue
			}
			regionCount[m.RegionId]++
			accounts = append(accounts, m)
			accountExist[m.Did] = true
		}
		if len(accounts)%100000 == 0 {
			fmt.Println("grpc sync kyc", "length", len(accounts))
		}
		if len(response.Pagination.NextKey) > 0 {
			return getAccount(accounts, response.Pagination.NextKey)
		}
		return accounts, nil
	}
	res, err := getAccount(credentials, nil)
	return res, regionCount, err
}

func (cli *Client) QueryDidAll() ([]kyctypes.Did, error) {
	var getAccount func([]kyctypes.Did, []byte) []kyctypes.Did
	accountExist := make(map[string]bool)
	credentials := []kyctypes.Did{}
	getAccount = func(accounts []kyctypes.Did, nextKey []byte) []kyctypes.Did {
		response, err := cli.kycClient.DidAll(context.Background(), &kyctypes.QueryAllDidRequest{
			Pagination: &query.PageRequest{
				Limit: 200,
				Key:   nextKey,
			}})
		if err != nil {
			logrus.Error(err)
		}
		for _, m := range response.Did {
			if _, ok := accountExist[m.Address]; ok {
				continue
			}
			accounts = append(accounts, m)
			accountExist[m.Address] = true
		}
		if len(response.Pagination.NextKey) > 0 {
			return getAccount(accounts, response.Pagination.NextKey)
		}
		return accounts
	}
	return getAccount(credentials, nil), nil
}
