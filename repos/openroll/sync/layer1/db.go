package layer1

import (
	"encoding/binary"
	"encoding/json"
	"path/filepath"

	tmdb "github.com/tendermint/tm-db"
)

func newGoLevelDB(homedir string) (*kycDB, error) {
	dbPath := filepath.Join(homedir, "data", "layer1")
	db, err := tmdb.NewGoLevelDB("kyc", dbPath)
	if err != nil {
		return nil, err
	}
	return &kycDB{db: db}, nil
}

type kycDB struct {
	db *tmdb.GoLevelDB
}

var updateAddressPrefixKey = []byte("updateAddress/key/")

var updateDIDPrefixKey = []byte("updateDID/key/")

var latestSequencePrefixKey = []byte("latestSequence/key/")

func (k *kycDB) GetAddress(address string) (int64, error) {
	key := append(updateAddressPrefixKey, address...)
	value, err := k.db.Get(key)
	if err != nil {
		return 0, err
	}
	if value == nil {
		return 0, nil
	}
	return int64(binary.BigEndian.Uint64(value)), nil
}

func (k *kycDB) UpdateAddress(address string, hubHeight int64) error {
	key := append(updateAddressPrefixKey, address...)

	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, uint64(hubHeight))
	return k.db.Set(key, buf)
}

func (k *kycDB) GetDID(did string) (int64, error) {
	key := append(updateDIDPrefixKey, did...)
	value, err := k.db.Get(key)
	if err != nil {
		return 0, err
	}
	if value == nil {
		return 0, nil
	}
	return int64(binary.BigEndian.Uint64(value)), nil
}

func (k *kycDB) UpdateDID(did string, hubHeight int64) error {
	key := append(updateDIDPrefixKey, did...)

	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, uint64(hubHeight))
	return k.db.Set(key, buf)
}

func (k *kycDB) SaveUpdateStatus(did []string, addrs []string, height int64) error {
	for _, did := range did {
		err := k.UpdateDID(did, height)
		if err != nil {
			return err
		}
	}
	for _, addr := range addrs {
		err := k.UpdateAddress(addr, height)
		if err != nil {
			return err
		}
	}
	return nil
}

func (k *kycDB) GetLatestSequence() (*Sequence, error) {
	latestSequence, err := k.db.Get(latestSequencePrefixKey)
	if err != nil {
		return nil, err
	}
	if latestSequence == nil {
		return nil, nil
	}
	var seqence Sequence
	err = json.Unmarshal(latestSequence, &seqence)
	return &seqence, err
}

func (k *kycDB) UpdateLatestSequence(seq int64, height int64) error {
	buf, err := json.Marshal(Sequence{Seq: seq, Height: height})
	if err != nil {
		return err
	}
	return k.db.Set(latestSequencePrefixKey, buf)
}

func (k *kycDB) ClearSeq() error {
	sequence, err := k.GetLatestSequence()
	if err != nil || sequence == nil {
		return err
	}
	return k.db.Delete(latestSequencePrefixKey)
}
