#!/bin/bash

KEYRING_PATH="$HOME/.rollapp/sequencer_keys"
KEY_NAME_SEQUENCER="sequencer"
MAX_SEQUENCERS=1

#Register rollapp 
med tx rollapp create-rollapp "$ROLLAPP_CHAIN_ID" "$MAX_SEQUENCERS" '{"Addresses":[]}' \
  --from "$KEY_NAME_SEQUENCER" \
  --keyring-backend test \
  --keyring-dir "$KEYRING_PATH" \
  --broadcast-mode sync \
  --gas auto \
  --fees 200000000umec \
  --yes
