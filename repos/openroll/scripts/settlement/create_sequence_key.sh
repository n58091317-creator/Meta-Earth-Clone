#!/bin/bash

echo "false poet whale sample can recycle grape robot great rent spare foil" | med keys add sequencer --keyring-dir ~/.rollapp/sequencer_keys --keyring-backend test --recover

SEQUENCER_ADDR=$(med keys show sequencer --address --keyring-backend test --keyring-dir ~/.rollapp/sequencer_keys)

med tx bank send settlement_acc $SEQUENCER_ADDR 100000000000000umec \
    --keyring-backend test \
    --broadcast-mode sync \
    --fees 100000mec \
    --yes