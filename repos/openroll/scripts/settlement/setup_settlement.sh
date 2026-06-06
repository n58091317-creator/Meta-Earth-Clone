#!/bin/bash
export ROLLAPP_CHAIN_ID="${ROLLAPP_CHAIN_ID:-rollapp_1234-1}"
DYMINT_CONFIG_PATH="$HOME/.rollapp/config/dymint.toml"

EXECUTABLE="rollappd"
MAX_SEQUENCERS=1

SETTLEMENT_EXECUTABLE="med"
KEYRING_PATH="$HOME/.mechain"
KEY_NAME_SEQUENCER="sequencer"
SETTLEMENT_KEY_NAME_GENESIS="settlement_acc"
SETTLEMENT_DENOM="umec"

# check required paths and variables
if [ ! -f "$DYMINT_CONFIG_PATH" ]; then
    echo "Error: Dymint config file not found at $DYMINT_CONFIG_PATH"
    exit 1
fi

if [ ! -d "$KEYRING_PATH" ]; then
    echo "Keyring path not found, creating: $KEYRING_PATH"
    mkdir -p "$KEYRING_PATH"
fi

# send balance to sequencer
KEY_ADDRESS_SEQUENCER=$($SETTLEMENT_EXECUTABLE keys show $KEY_NAME_SEQUENCER --keyring-backend test -a)
SEND_SYNCER_TX_OUTPUT=$($SETTLEMENT_EXECUTABLE tx bank send $SETTLEMENT_KEY_NAME_GENESIS $KEY_ADDRESS_SEQUENCER 1000000000000$SETTLEMENT_DENOM \
  --keyring-backend test \
  --gas 200000 \
  --fees 200000000$SETTLEMENT_DENOM -y
)
SEND_SYNCER_TX_HASH=$(echo "$SEND_SYNCER_TX_OUTPUT" | grep -oE "txhash: [a-fA-F0-9]+" | cut -d' ' -f2)
echo "Confirm whether the transaction is successful: \"$SETTLEMENT_EXECUTABLE q tx $SEND_SYNCER_TX_HASH\""
read -r answer

# set dymint configuration
echo "Setting Dymint configuration..."
sed -i 's/^settlement_layer = ".*"/settlement_layer = "dymension"/' "$DYMINT_CONFIG_PATH"
sed -i 's|^keyring_home_dir = ".*"|keyring_home_dir = "'"$KEYRING_PATH"'"|' "$DYMINT_CONFIG_PATH"
sed -i 's|^dym_account_name = ".*"|dym_account_name = "'"$KEY_NAME_SEQUENCER"'"|' "$DYMINT_CONFIG_PATH"
sed -i'' -e 's|^settlement_gas_prices *=.*|settlement_gas_prices = "0.05umec"|' "$DYMINT_CONFIG_PATH"

#Register rollapp 
echo "Send create rollapp transaction..."
ROLLAPP_TX_OUTPUT=$($SETTLEMENT_EXECUTABLE tx rollapp create-rollapp "$ROLLAPP_CHAIN_ID" "$MAX_SEQUENCERS" '{"Addresses":[]}' \
  --from "$KEY_NAME_SEQUENCER" \
  --keyring-backend test \
  --keyring-dir "$KEYRING_PATH" \
  --broadcast-mode sync \
  --gas 500000 \
  --fees 200000000umec \
  --yes)

ROLLAPP_TX_HASH=$(echo "$ROLLAPP_TX_OUTPUT" | grep -oE "txhash: [a-fA-F0-9]+" | cut -d' ' -f2)
echo "Confirm whether the transaction is successful: \"$SETTLEMENT_EXECUTABLE q tx $ROLLAPP_TX_HASH\""
read -r answer

#Register Sequencer
DESCRIPTION="{\"Moniker\":\"myrollapp-sequencer\",\"Identity\":\"\",\"Website\":\"\",\"SecurityContact\":\"\",\"Details\":\"\"}";
SEQ_PUB_KEY="$($EXECUTABLE dymint show-sequencer)"

echo "Send create sequencer transaction..."
SQUENCER_TX_OUTPUT=$($SETTLEMENT_EXECUTABLE tx sequencer create-sequencer "$SEQ_PUB_KEY" "$ROLLAPP_CHAIN_ID" "$DESCRIPTION" "1000000umec"\
  --from "$KEY_NAME_SEQUENCER" \
  --keyring-dir "$KEYRING_PATH" \
  --keyring-backend test \
  --broadcast-mode sync \
  --gas 500000 \
  --fees 200000000umec \
  --yes)

SQUENCER_TX_HASH=$(echo "$SQUENCER_TX_OUTPUT" | grep -oE "txhash: [a-fA-F0-9]+" | cut -d' ' -f2)
echo "Confirm whether the transaction is successful: \"$SETTLEMENT_EXECUTABLE q tx $SQUENCER_TX_HASH\""
read -r answer

echo "Setup completed successfully!"