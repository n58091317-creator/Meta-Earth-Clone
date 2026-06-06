/* eslint-disable */
import _m0 from "protobufjs/minimal";
import { Did } from "./did";
import { DidInfo } from "./did_info";
import { KYCCredential } from "./kyc_credential";
import { Params } from "./params";

export const protobufPackage = "stchain.rollapp.kyc";

/** GenesisState defines the kyc module's genesis state. */
export interface GenesisState {
  params: Params | undefined;
  portId: string;
  kYCCredentialList: KYCCredential[];
  didList: Did[];
  didInfoList: DidInfo[];
}

function createBaseGenesisState(): GenesisState {
  return { params: undefined, portId: "", kYCCredentialList: [], didList: [], didInfoList: [] };
}

export const GenesisState = {
  encode(message: GenesisState, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.params !== undefined) {
      Params.encode(message.params, writer.uint32(10).fork()).ldelim();
    }
    if (message.portId !== "") {
      writer.uint32(18).string(message.portId);
    }
    for (const v of message.kYCCredentialList) {
      KYCCredential.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    for (const v of message.didList) {
      Did.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    for (const v of message.didInfoList) {
      DidInfo.encode(v!, writer.uint32(42).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GenesisState {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGenesisState();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.params = Params.decode(reader, reader.uint32());
          break;
        case 2:
          message.portId = reader.string();
          break;
        case 3:
          message.kYCCredentialList.push(KYCCredential.decode(reader, reader.uint32()));
          break;
        case 4:
          message.didList.push(Did.decode(reader, reader.uint32()));
          break;
        case 5:
          message.didInfoList.push(DidInfo.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): GenesisState {
    return {
      params: isSet(object.params) ? Params.fromJSON(object.params) : undefined,
      portId: isSet(object.portId) ? String(object.portId) : "",
      kYCCredentialList: Array.isArray(object?.kYCCredentialList)
        ? object.kYCCredentialList.map((e: any) => KYCCredential.fromJSON(e))
        : [],
      didList: Array.isArray(object?.didList) ? object.didList.map((e: any) => Did.fromJSON(e)) : [],
      didInfoList: Array.isArray(object?.didInfoList) ? object.didInfoList.map((e: any) => DidInfo.fromJSON(e)) : [],
    };
  },

  toJSON(message: GenesisState): unknown {
    const obj: any = {};
    message.params !== undefined && (obj.params = message.params ? Params.toJSON(message.params) : undefined);
    message.portId !== undefined && (obj.portId = message.portId);
    if (message.kYCCredentialList) {
      obj.kYCCredentialList = message.kYCCredentialList.map((e) => e ? KYCCredential.toJSON(e) : undefined);
    } else {
      obj.kYCCredentialList = [];
    }
    if (message.didList) {
      obj.didList = message.didList.map((e) => e ? Did.toJSON(e) : undefined);
    } else {
      obj.didList = [];
    }
    if (message.didInfoList) {
      obj.didInfoList = message.didInfoList.map((e) => e ? DidInfo.toJSON(e) : undefined);
    } else {
      obj.didInfoList = [];
    }
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<GenesisState>, I>>(object: I): GenesisState {
    const message = createBaseGenesisState();
    message.params = (object.params !== undefined && object.params !== null)
      ? Params.fromPartial(object.params)
      : undefined;
    message.portId = object.portId ?? "";
    message.kYCCredentialList = object.kYCCredentialList?.map((e) => KYCCredential.fromPartial(e)) || [];
    message.didList = object.didList?.map((e) => Did.fromPartial(e)) || [];
    message.didInfoList = object.didInfoList?.map((e) => DidInfo.fromPartial(e)) || [];
    return message;
  },
};

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
