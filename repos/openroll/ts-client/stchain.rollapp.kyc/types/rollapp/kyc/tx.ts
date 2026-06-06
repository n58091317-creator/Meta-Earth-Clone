/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";

export const protobufPackage = "stchain.rollapp.kyc";

export interface MsgUpdateDID {
  creator: string;
  proofHeight: number;
  storeHash: Uint8Array;
  storeProof: Uint8Array;
  proofs: Uint8Array;
  dids: item[];
}

export interface MsgUpdateDIDResponse {
}

export interface MsgUpdateCredential {
  creator: string;
  proofHeight: number;
  storeHash: Uint8Array;
  storeProof: Uint8Array;
  proofs: Uint8Array;
  credentials: item[];
}

export interface MsgUpdateCredentialResponse {
}

export interface item {
  key: Uint8Array;
  value: Uint8Array;
}

export interface MsgRemoveKyc {
  creator: string;
  proofHeight: number;
  storeHash: Uint8Array;
  storeProof: Uint8Array;
  proofs: Uint8Array;
  credentials: item[];
}

export interface MsgRemoveKycResponse {
}

export interface MsgUpdateKycInfo {
  creator: string;
  proofHeight: number;
  storeHash: Uint8Array;
  storeProof: Uint8Array;
  proofs: Uint8Array;
  didInfos: item[];
}

export interface MsgUpdateKycInfoResponse {
}

function createBaseMsgUpdateDID(): MsgUpdateDID {
  return {
    creator: "",
    proofHeight: 0,
    storeHash: new Uint8Array(),
    storeProof: new Uint8Array(),
    proofs: new Uint8Array(),
    dids: [],
  };
}

export const MsgUpdateDID = {
  encode(message: MsgUpdateDID, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.creator !== "") {
      writer.uint32(10).string(message.creator);
    }
    if (message.proofHeight !== 0) {
      writer.uint32(16).uint64(message.proofHeight);
    }
    if (message.storeHash.length !== 0) {
      writer.uint32(26).bytes(message.storeHash);
    }
    if (message.storeProof.length !== 0) {
      writer.uint32(34).bytes(message.storeProof);
    }
    if (message.proofs.length !== 0) {
      writer.uint32(42).bytes(message.proofs);
    }
    for (const v of message.dids) {
      item.encode(v!, writer.uint32(50).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgUpdateDID {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateDID();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.creator = reader.string();
          break;
        case 2:
          message.proofHeight = longToNumber(reader.uint64() as Long);
          break;
        case 3:
          message.storeHash = reader.bytes();
          break;
        case 4:
          message.storeProof = reader.bytes();
          break;
        case 5:
          message.proofs = reader.bytes();
          break;
        case 6:
          message.dids.push(item.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): MsgUpdateDID {
    return {
      creator: isSet(object.creator) ? String(object.creator) : "",
      proofHeight: isSet(object.proofHeight) ? Number(object.proofHeight) : 0,
      storeHash: isSet(object.storeHash) ? bytesFromBase64(object.storeHash) : new Uint8Array(),
      storeProof: isSet(object.storeProof) ? bytesFromBase64(object.storeProof) : new Uint8Array(),
      proofs: isSet(object.proofs) ? bytesFromBase64(object.proofs) : new Uint8Array(),
      dids: Array.isArray(object?.dids) ? object.dids.map((e: any) => item.fromJSON(e)) : [],
    };
  },

  toJSON(message: MsgUpdateDID): unknown {
    const obj: any = {};
    message.creator !== undefined && (obj.creator = message.creator);
    message.proofHeight !== undefined && (obj.proofHeight = Math.round(message.proofHeight));
    message.storeHash !== undefined
      && (obj.storeHash = base64FromBytes(message.storeHash !== undefined ? message.storeHash : new Uint8Array()));
    message.storeProof !== undefined
      && (obj.storeProof = base64FromBytes(message.storeProof !== undefined ? message.storeProof : new Uint8Array()));
    message.proofs !== undefined
      && (obj.proofs = base64FromBytes(message.proofs !== undefined ? message.proofs : new Uint8Array()));
    if (message.dids) {
      obj.dids = message.dids.map((e) => e ? item.toJSON(e) : undefined);
    } else {
      obj.dids = [];
    }
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<MsgUpdateDID>, I>>(object: I): MsgUpdateDID {
    const message = createBaseMsgUpdateDID();
    message.creator = object.creator ?? "";
    message.proofHeight = object.proofHeight ?? 0;
    message.storeHash = object.storeHash ?? new Uint8Array();
    message.storeProof = object.storeProof ?? new Uint8Array();
    message.proofs = object.proofs ?? new Uint8Array();
    message.dids = object.dids?.map((e) => item.fromPartial(e)) || [];
    return message;
  },
};

function createBaseMsgUpdateDIDResponse(): MsgUpdateDIDResponse {
  return {};
}

export const MsgUpdateDIDResponse = {
  encode(_: MsgUpdateDIDResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgUpdateDIDResponse {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateDIDResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(_: any): MsgUpdateDIDResponse {
    return {};
  },

  toJSON(_: MsgUpdateDIDResponse): unknown {
    const obj: any = {};
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<MsgUpdateDIDResponse>, I>>(_: I): MsgUpdateDIDResponse {
    const message = createBaseMsgUpdateDIDResponse();
    return message;
  },
};

function createBaseMsgUpdateCredential(): MsgUpdateCredential {
  return {
    creator: "",
    proofHeight: 0,
    storeHash: new Uint8Array(),
    storeProof: new Uint8Array(),
    proofs: new Uint8Array(),
    credentials: [],
  };
}

export const MsgUpdateCredential = {
  encode(message: MsgUpdateCredential, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.creator !== "") {
      writer.uint32(10).string(message.creator);
    }
    if (message.proofHeight !== 0) {
      writer.uint32(16).uint64(message.proofHeight);
    }
    if (message.storeHash.length !== 0) {
      writer.uint32(26).bytes(message.storeHash);
    }
    if (message.storeProof.length !== 0) {
      writer.uint32(34).bytes(message.storeProof);
    }
    if (message.proofs.length !== 0) {
      writer.uint32(42).bytes(message.proofs);
    }
    for (const v of message.credentials) {
      item.encode(v!, writer.uint32(50).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgUpdateCredential {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateCredential();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.creator = reader.string();
          break;
        case 2:
          message.proofHeight = longToNumber(reader.uint64() as Long);
          break;
        case 3:
          message.storeHash = reader.bytes();
          break;
        case 4:
          message.storeProof = reader.bytes();
          break;
        case 5:
          message.proofs = reader.bytes();
          break;
        case 6:
          message.credentials.push(item.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): MsgUpdateCredential {
    return {
      creator: isSet(object.creator) ? String(object.creator) : "",
      proofHeight: isSet(object.proofHeight) ? Number(object.proofHeight) : 0,
      storeHash: isSet(object.storeHash) ? bytesFromBase64(object.storeHash) : new Uint8Array(),
      storeProof: isSet(object.storeProof) ? bytesFromBase64(object.storeProof) : new Uint8Array(),
      proofs: isSet(object.proofs) ? bytesFromBase64(object.proofs) : new Uint8Array(),
      credentials: Array.isArray(object?.credentials) ? object.credentials.map((e: any) => item.fromJSON(e)) : [],
    };
  },

  toJSON(message: MsgUpdateCredential): unknown {
    const obj: any = {};
    message.creator !== undefined && (obj.creator = message.creator);
    message.proofHeight !== undefined && (obj.proofHeight = Math.round(message.proofHeight));
    message.storeHash !== undefined
      && (obj.storeHash = base64FromBytes(message.storeHash !== undefined ? message.storeHash : new Uint8Array()));
    message.storeProof !== undefined
      && (obj.storeProof = base64FromBytes(message.storeProof !== undefined ? message.storeProof : new Uint8Array()));
    message.proofs !== undefined
      && (obj.proofs = base64FromBytes(message.proofs !== undefined ? message.proofs : new Uint8Array()));
    if (message.credentials) {
      obj.credentials = message.credentials.map((e) => e ? item.toJSON(e) : undefined);
    } else {
      obj.credentials = [];
    }
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<MsgUpdateCredential>, I>>(object: I): MsgUpdateCredential {
    const message = createBaseMsgUpdateCredential();
    message.creator = object.creator ?? "";
    message.proofHeight = object.proofHeight ?? 0;
    message.storeHash = object.storeHash ?? new Uint8Array();
    message.storeProof = object.storeProof ?? new Uint8Array();
    message.proofs = object.proofs ?? new Uint8Array();
    message.credentials = object.credentials?.map((e) => item.fromPartial(e)) || [];
    return message;
  },
};

function createBaseMsgUpdateCredentialResponse(): MsgUpdateCredentialResponse {
  return {};
}

export const MsgUpdateCredentialResponse = {
  encode(_: MsgUpdateCredentialResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgUpdateCredentialResponse {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateCredentialResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(_: any): MsgUpdateCredentialResponse {
    return {};
  },

  toJSON(_: MsgUpdateCredentialResponse): unknown {
    const obj: any = {};
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<MsgUpdateCredentialResponse>, I>>(_: I): MsgUpdateCredentialResponse {
    const message = createBaseMsgUpdateCredentialResponse();
    return message;
  },
};

function createBaseitem(): item {
  return { key: new Uint8Array(), value: new Uint8Array() };
}

export const item = {
  encode(message: item, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.key.length !== 0) {
      writer.uint32(10).bytes(message.key);
    }
    if (message.value.length !== 0) {
      writer.uint32(18).bytes(message.value);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): item {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseitem();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.key = reader.bytes();
          break;
        case 2:
          message.value = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): item {
    return {
      key: isSet(object.key) ? bytesFromBase64(object.key) : new Uint8Array(),
      value: isSet(object.value) ? bytesFromBase64(object.value) : new Uint8Array(),
    };
  },

  toJSON(message: item): unknown {
    const obj: any = {};
    message.key !== undefined
      && (obj.key = base64FromBytes(message.key !== undefined ? message.key : new Uint8Array()));
    message.value !== undefined
      && (obj.value = base64FromBytes(message.value !== undefined ? message.value : new Uint8Array()));
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<item>, I>>(object: I): item {
    const message = createBaseitem();
    message.key = object.key ?? new Uint8Array();
    message.value = object.value ?? new Uint8Array();
    return message;
  },
};

function createBaseMsgRemoveKyc(): MsgRemoveKyc {
  return {
    creator: "",
    proofHeight: 0,
    storeHash: new Uint8Array(),
    storeProof: new Uint8Array(),
    proofs: new Uint8Array(),
    credentials: [],
  };
}

export const MsgRemoveKyc = {
  encode(message: MsgRemoveKyc, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.creator !== "") {
      writer.uint32(10).string(message.creator);
    }
    if (message.proofHeight !== 0) {
      writer.uint32(16).uint64(message.proofHeight);
    }
    if (message.storeHash.length !== 0) {
      writer.uint32(26).bytes(message.storeHash);
    }
    if (message.storeProof.length !== 0) {
      writer.uint32(34).bytes(message.storeProof);
    }
    if (message.proofs.length !== 0) {
      writer.uint32(42).bytes(message.proofs);
    }
    for (const v of message.credentials) {
      item.encode(v!, writer.uint32(50).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgRemoveKyc {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRemoveKyc();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.creator = reader.string();
          break;
        case 2:
          message.proofHeight = longToNumber(reader.uint64() as Long);
          break;
        case 3:
          message.storeHash = reader.bytes();
          break;
        case 4:
          message.storeProof = reader.bytes();
          break;
        case 5:
          message.proofs = reader.bytes();
          break;
        case 6:
          message.credentials.push(item.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): MsgRemoveKyc {
    return {
      creator: isSet(object.creator) ? String(object.creator) : "",
      proofHeight: isSet(object.proofHeight) ? Number(object.proofHeight) : 0,
      storeHash: isSet(object.storeHash) ? bytesFromBase64(object.storeHash) : new Uint8Array(),
      storeProof: isSet(object.storeProof) ? bytesFromBase64(object.storeProof) : new Uint8Array(),
      proofs: isSet(object.proofs) ? bytesFromBase64(object.proofs) : new Uint8Array(),
      credentials: Array.isArray(object?.credentials) ? object.credentials.map((e: any) => item.fromJSON(e)) : [],
    };
  },

  toJSON(message: MsgRemoveKyc): unknown {
    const obj: any = {};
    message.creator !== undefined && (obj.creator = message.creator);
    message.proofHeight !== undefined && (obj.proofHeight = Math.round(message.proofHeight));
    message.storeHash !== undefined
      && (obj.storeHash = base64FromBytes(message.storeHash !== undefined ? message.storeHash : new Uint8Array()));
    message.storeProof !== undefined
      && (obj.storeProof = base64FromBytes(message.storeProof !== undefined ? message.storeProof : new Uint8Array()));
    message.proofs !== undefined
      && (obj.proofs = base64FromBytes(message.proofs !== undefined ? message.proofs : new Uint8Array()));
    if (message.credentials) {
      obj.credentials = message.credentials.map((e) => e ? item.toJSON(e) : undefined);
    } else {
      obj.credentials = [];
    }
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<MsgRemoveKyc>, I>>(object: I): MsgRemoveKyc {
    const message = createBaseMsgRemoveKyc();
    message.creator = object.creator ?? "";
    message.proofHeight = object.proofHeight ?? 0;
    message.storeHash = object.storeHash ?? new Uint8Array();
    message.storeProof = object.storeProof ?? new Uint8Array();
    message.proofs = object.proofs ?? new Uint8Array();
    message.credentials = object.credentials?.map((e) => item.fromPartial(e)) || [];
    return message;
  },
};

function createBaseMsgRemoveKycResponse(): MsgRemoveKycResponse {
  return {};
}

export const MsgRemoveKycResponse = {
  encode(_: MsgRemoveKycResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgRemoveKycResponse {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRemoveKycResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(_: any): MsgRemoveKycResponse {
    return {};
  },

  toJSON(_: MsgRemoveKycResponse): unknown {
    const obj: any = {};
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<MsgRemoveKycResponse>, I>>(_: I): MsgRemoveKycResponse {
    const message = createBaseMsgRemoveKycResponse();
    return message;
  },
};

function createBaseMsgUpdateKycInfo(): MsgUpdateKycInfo {
  return {
    creator: "",
    proofHeight: 0,
    storeHash: new Uint8Array(),
    storeProof: new Uint8Array(),
    proofs: new Uint8Array(),
    didInfos: [],
  };
}

export const MsgUpdateKycInfo = {
  encode(message: MsgUpdateKycInfo, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.creator !== "") {
      writer.uint32(10).string(message.creator);
    }
    if (message.proofHeight !== 0) {
      writer.uint32(16).uint64(message.proofHeight);
    }
    if (message.storeHash.length !== 0) {
      writer.uint32(26).bytes(message.storeHash);
    }
    if (message.storeProof.length !== 0) {
      writer.uint32(34).bytes(message.storeProof);
    }
    if (message.proofs.length !== 0) {
      writer.uint32(42).bytes(message.proofs);
    }
    for (const v of message.didInfos) {
      item.encode(v!, writer.uint32(50).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgUpdateKycInfo {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateKycInfo();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.creator = reader.string();
          break;
        case 2:
          message.proofHeight = longToNumber(reader.uint64() as Long);
          break;
        case 3:
          message.storeHash = reader.bytes();
          break;
        case 4:
          message.storeProof = reader.bytes();
          break;
        case 5:
          message.proofs = reader.bytes();
          break;
        case 6:
          message.didInfos.push(item.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): MsgUpdateKycInfo {
    return {
      creator: isSet(object.creator) ? String(object.creator) : "",
      proofHeight: isSet(object.proofHeight) ? Number(object.proofHeight) : 0,
      storeHash: isSet(object.storeHash) ? bytesFromBase64(object.storeHash) : new Uint8Array(),
      storeProof: isSet(object.storeProof) ? bytesFromBase64(object.storeProof) : new Uint8Array(),
      proofs: isSet(object.proofs) ? bytesFromBase64(object.proofs) : new Uint8Array(),
      didInfos: Array.isArray(object?.didInfos) ? object.didInfos.map((e: any) => item.fromJSON(e)) : [],
    };
  },

  toJSON(message: MsgUpdateKycInfo): unknown {
    const obj: any = {};
    message.creator !== undefined && (obj.creator = message.creator);
    message.proofHeight !== undefined && (obj.proofHeight = Math.round(message.proofHeight));
    message.storeHash !== undefined
      && (obj.storeHash = base64FromBytes(message.storeHash !== undefined ? message.storeHash : new Uint8Array()));
    message.storeProof !== undefined
      && (obj.storeProof = base64FromBytes(message.storeProof !== undefined ? message.storeProof : new Uint8Array()));
    message.proofs !== undefined
      && (obj.proofs = base64FromBytes(message.proofs !== undefined ? message.proofs : new Uint8Array()));
    if (message.didInfos) {
      obj.didInfos = message.didInfos.map((e) => e ? item.toJSON(e) : undefined);
    } else {
      obj.didInfos = [];
    }
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<MsgUpdateKycInfo>, I>>(object: I): MsgUpdateKycInfo {
    const message = createBaseMsgUpdateKycInfo();
    message.creator = object.creator ?? "";
    message.proofHeight = object.proofHeight ?? 0;
    message.storeHash = object.storeHash ?? new Uint8Array();
    message.storeProof = object.storeProof ?? new Uint8Array();
    message.proofs = object.proofs ?? new Uint8Array();
    message.didInfos = object.didInfos?.map((e) => item.fromPartial(e)) || [];
    return message;
  },
};

function createBaseMsgUpdateKycInfoResponse(): MsgUpdateKycInfoResponse {
  return {};
}

export const MsgUpdateKycInfoResponse = {
  encode(_: MsgUpdateKycInfoResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgUpdateKycInfoResponse {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateKycInfoResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(_: any): MsgUpdateKycInfoResponse {
    return {};
  },

  toJSON(_: MsgUpdateKycInfoResponse): unknown {
    const obj: any = {};
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<MsgUpdateKycInfoResponse>, I>>(_: I): MsgUpdateKycInfoResponse {
    const message = createBaseMsgUpdateKycInfoResponse();
    return message;
  },
};

/** Msg defines the Msg service. */
export interface Msg {
  UpdateDID(request: MsgUpdateDID): Promise<MsgUpdateDIDResponse>;
  UpdateCredential(request: MsgUpdateCredential): Promise<MsgUpdateCredentialResponse>;
  RemoveKyc(request: MsgRemoveKyc): Promise<MsgRemoveKycResponse>;
  UpdateKycInfo(request: MsgUpdateKycInfo): Promise<MsgUpdateKycInfoResponse>;
}

export class MsgClientImpl implements Msg {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.UpdateDID = this.UpdateDID.bind(this);
    this.UpdateCredential = this.UpdateCredential.bind(this);
    this.RemoveKyc = this.RemoveKyc.bind(this);
    this.UpdateKycInfo = this.UpdateKycInfo.bind(this);
  }
  UpdateDID(request: MsgUpdateDID): Promise<MsgUpdateDIDResponse> {
    const data = MsgUpdateDID.encode(request).finish();
    const promise = this.rpc.request("stchain.rollapp.kyc.Msg", "UpdateDID", data);
    return promise.then((data) => MsgUpdateDIDResponse.decode(new _m0.Reader(data)));
  }

  UpdateCredential(request: MsgUpdateCredential): Promise<MsgUpdateCredentialResponse> {
    const data = MsgUpdateCredential.encode(request).finish();
    const promise = this.rpc.request("stchain.rollapp.kyc.Msg", "UpdateCredential", data);
    return promise.then((data) => MsgUpdateCredentialResponse.decode(new _m0.Reader(data)));
  }

  RemoveKyc(request: MsgRemoveKyc): Promise<MsgRemoveKycResponse> {
    const data = MsgRemoveKyc.encode(request).finish();
    const promise = this.rpc.request("stchain.rollapp.kyc.Msg", "RemoveKyc", data);
    return promise.then((data) => MsgRemoveKycResponse.decode(new _m0.Reader(data)));
  }

  UpdateKycInfo(request: MsgUpdateKycInfo): Promise<MsgUpdateKycInfoResponse> {
    const data = MsgUpdateKycInfo.encode(request).finish();
    const promise = this.rpc.request("stchain.rollapp.kyc.Msg", "UpdateKycInfo", data);
    return promise.then((data) => MsgUpdateKycInfoResponse.decode(new _m0.Reader(data)));
  }
}

interface Rpc {
  request(service: string, method: string, data: Uint8Array): Promise<Uint8Array>;
}

declare var self: any | undefined;
declare var window: any | undefined;
declare var global: any | undefined;
var globalThis: any = (() => {
  if (typeof globalThis !== "undefined") {
    return globalThis;
  }
  if (typeof self !== "undefined") {
    return self;
  }
  if (typeof window !== "undefined") {
    return window;
  }
  if (typeof global !== "undefined") {
    return global;
  }
  throw "Unable to locate global object";
})();

function bytesFromBase64(b64: string): Uint8Array {
  if (globalThis.Buffer) {
    return Uint8Array.from(globalThis.Buffer.from(b64, "base64"));
  } else {
    const bin = globalThis.atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; ++i) {
      arr[i] = bin.charCodeAt(i);
    }
    return arr;
  }
}

function base64FromBytes(arr: Uint8Array): string {
  if (globalThis.Buffer) {
    return globalThis.Buffer.from(arr).toString("base64");
  } else {
    const bin: string[] = [];
    arr.forEach((byte) => {
      bin.push(String.fromCharCode(byte));
    });
    return globalThis.btoa(bin.join(""));
  }
}

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

function longToNumber(long: Long): number {
  if (long.gt(Number.MAX_SAFE_INTEGER)) {
    throw new globalThis.Error("Value is larger than Number.MAX_SAFE_INTEGER");
  }
  return long.toNumber();
}

if (_m0.util.Long !== Long) {
  _m0.util.Long = Long as any;
  _m0.configure();
}

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
