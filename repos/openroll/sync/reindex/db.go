package reindex

import (
	"encoding/binary"
	"fmt"
	"path/filepath"

	tmdb "github.com/tendermint/tm-db"
)

func NewReindexDb(homedir string) (*ReindexDB, error) {
	dbPath := filepath.Join(homedir, "data", "reindex")
	db, err := tmdb.NewGoLevelDB("reindex", dbPath)
	if err != nil {
		return nil, err
	}
	reindexDb := &ReindexDB{db: db}
	return reindexDb, nil
}

type ReindexDB struct {
	db *tmdb.GoLevelDB
}

var reindexheightPrefixKey = []byte("ReindexHeight/key/")

func (k *ReindexDB) SetReindexHeight(height uint64) error {
	byteArray := make([]byte, 8)
	binary.LittleEndian.PutUint64(byteArray, height)
	return k.db.Set(reindexheightPrefixKey, byteArray)
}

func (k *ReindexDB) GetReindexHeight() (uint64, error) {
	byteArray, err := k.db.Get(reindexheightPrefixKey)
	if err != nil {
		return 0, err
	}
	if byteArray == nil {
		return 0, fmt.Errorf("not found")
	}
	return binary.LittleEndian.Uint64(byteArray), nil
}
