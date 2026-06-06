#!/bin/bash

DA_LAYER="${DA_LAYER:-celestia}"
DA_RPC_URL="${DA_RPC_URL:-http://172.16.5.183:26658}"

ROLLAPP_CHAIN_DIR="$HOME/.rollapp"
CONFIG_DIRECTORY="$ROLLAPP_CHAIN_DIR/config"
DYMINT_CONFIG_FILE="$CONFIG_DIRECTORY/dymint.toml"

# ------------------------------- celestia config ------------------------------ #
sed -i'' -e "s/^da_layer *=.*/da_layer = \"$DA_LAYER\"/" "$DYMINT_CONFIG_FILE"
sed -i'' -e 's/^namespace_id *=.*/namespace_id = "0000000000000000ffff"/' "$DYMINT_CONFIG_FILE"
# sed -i'' -e 's|^da_config *=.*|da_config = "{\"base_url\": \"http://172.16.5.183:26658\", \"timeout\": 50000000000, \"gas_prices\": 0.1, \"auth_token\": \"TOKEN\", \"backoff\": {\"initial_delay\": 6000000000, \"max_delay\": 6000000000, \"growth_factor\": 2}, \"retry_attempts\": 4, \"retry_delay\": 3000000000}\"|' /home/shing/.rollapp/config/dymint.toml
sed -i'' -e 's|^da_config *=.*|da_config = "{\\\"base_url\\\": \\\"'"$DA_RPC_URL"'\\\", \\\"timeout\\\": 50000000000, \\\"gas_prices\\\": 0.1, \\\"auth_token\\\": \\\"TOKEN\\\", \\\"backoff\\\": {\\\"initial_delay\\\": 6000000000, \\\"max_delay\\\": 6000000000, \\\"growth_factor\\\": 2}, \\\"retry_attempts\\\": 4, \\\"retry_delay\\\": 3000000000}\"|' /home/shing/.rollapp/config/dymint.toml


