# stage 1 Generate celestia-appd Binary
FROM docker.io/golang:1.23.4-alpine3.19 as rollappBuilder
# hadolint ignore=DL3018
RUN apk update && apk add --no-cache \
    gcc \
    git \
    # linux-headers are needed for Ledger support
    linux-headers \
    make \
    musl-dev
COPY . /rollapp
WORKDIR /rollapp
RUN make build

# stage 2
FROM docker.io/alpine:3.18.2

# Read here why UID 10001: https://github.com/hexops/dockerfile/blob/main/README.md#do-not-use-a-uid-below-10000
ARG UID=10001
ARG USER_NAME=rollup

ENV ROLLUP_APP_HOME=/home/${USER_NAME}

ENV ROLLAPP_CHAIN_ID="rollappevm_1234-1"
ENV KEY_NAME_ROLLAPP="roluser"
ENV DENOM="urax"
ENV MONIKER="rolmoniker"

# hadolint ignore=DL3018
RUN apk update && apk add --no-cache \
    curl \
    jq \
    bash

# Copy in the binary
COPY --from=rollappBuilder /rollapp/build/rollappd /bin/rollappd

COPY scripts /scripts


# Set the working directory to the home directory.
WORKDIR ${ROLLUP_APP_HOME}
# # Expose ports:
# # 1317 is the default API server port.
# # 9090 is the default GRPC server port.
# # 26656 is the default node p2p port.
# # 26657 is the default RPC port.
# # 26660 is the port used for Prometheus.
# # 26661 is the port used for tracing.
# EXPOSE 1317 9090 26656 26657 26660 26661
# ENTRYPOINT [ "/bin/bash", "/opt/entrypoint.sh" ]
