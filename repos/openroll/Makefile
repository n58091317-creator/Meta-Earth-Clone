#!/usr/bin/make -f

PROJECT_NAME=rollappd
BRANCH := $(shell git rev-parse --abbrev-ref HEAD)
COMMIT := $(shell git log -1 --format='%H')
TAG ?= latest

# don't override user values
ifeq (,$(VERSION))
  VERSION := $(shell git describe --tags --always --dirty)
  # if VERSION is empty, then populate it with branch's name and raw commit hash
  ifeq (,$(VERSION))
    VERSION := $(BRANCH)-$(COMMIT)
  endif
endif

ifndef $(GOPATH)
    GOPATH=$(shell go env GOPATH)
    export GOPATH
endif

TM_VERSION := $(shell go list -m github.com/tendermint/tendermint | sed 's:.* ::')

export GO111MODULE = on

# process linker flags
ldflags = -X github.com/cosmos/cosmos-sdk/version.Name=me-rdk \
		  -X github.com/cosmos/cosmos-sdk/version.AppName=rollappd \
		  -X github.com/cosmos/cosmos-sdk/version.Version=$(VERSION) \
		  -X github.com/cosmos/cosmos-sdk/version.Commit=$(COMMIT) \
	      -X github.com/tendermint/tendermint/version.TMCoreSemVer=$(TM_VERSION)

BUILD_FLAGS := -ldflags '$(ldflags)'

###########
# Install #
###########

all: install

.PHONY: install
install:
	@echo "--> Ensure dependencies have not been modified"
	@go mod verify
	@echo "--> installing rollappd"
	@go install $(BUILD_FLAGS) -v -mod=readonly ./cmd/rollappd


.PHONY: build build-debug build-linux
build: ## Compiles the rollapd binary
	go build  -o build/rollappd $(BUILD_FLAGS) -v -mod=readonly  ./cmd/rollappd

build-linux: go.sum
	@CC=x86_64-unknown-linux-gnu-gcc CGO_ENABLED=1 TARGET_CC=clang LEDGER_ENABLED=false GOOS=linux GOARCH=amd64 go build -mod=readonly $(BUILD_FLAGS) -o build/rollappd ./cmd/rollappd

build-debug: go.sum
	$(eval temp_ldflags := $(filter-out -w -s,$(ldflags)))
	CGO_ENABLED=0 go build -tags "$(build_tags)" -ldflags '$(temp_ldflags)' -gcflags "all=-N -l" -o build/rollappd ./cmd/rollappd

.PHONY: clean
clean: ## Clean temporary files
	go clean

###############################################################################
###                                Docker                                ###
###############################################################################
.PHONY: docker-github docker-local docker-run-debug

docker-github:
	DOCKER_BUILDKIT=1 docker build -t ghcr.io/st-chain/rollapp:latest -f Dockerfile .

# docker pull --platform=linux/amd64 ubuntu:24.04
docker-local: build-linux
	@DOCKER_BUILDKIT=1 docker build -t 192.168.0.79/rollapp/rollappd:$(TAG) -f Dockerfile_local .
	@docker push 192.168.0.79/rollapp/rollappd:$(TAG)

docker-run-debug:
	@DOCKER_BUILDKIT=1 docker-compose -f docker-compose.debug.yml up


###############################################################################
###                                Protobuf                                 ###
###############################################################################

protoVer=v0.7
protoImageName=tendermintdev/sdk-proto-gen:$(protoVer)
containerProtoGen=$(PROJECT_NAME)-proto-gen-$(protoVer)

proto-gen:
	@echo "Generating Protobuf files"
	@docker run --rm --name $(containerProtoGen) -v $(CURDIR):/workspace --workdir /workspace $(protoImageName) \
		sh ./scripts/protogen.sh;
	@go mod tidy

proto-clean:
	@echo "Cleaning proto generating docker container"
	@docker rm $(containerProtoGen) || true