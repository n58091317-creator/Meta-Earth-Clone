/* eslint-disable */
import _m0 from "protobufjs/minimal";
import { PageRequest, PageResponse } from "../../cosmos/base/query/v1beta1/pagination";
import { Credential } from "./credential";
import { Did } from "./did";
import { DidInfo } from "./did_info";
import { KYCCredential } from "./kyc_credential";
import { Params } from "./params";

export const protobufPackage = "stchain.rollapp.kyc";

/** QueryParamsRequest is request type for the Query/Params RPC method. */
export interface QueryParamsRequest {
}

/** QueryParamsResponse is response type for the Query/Params RPC method. */
export interface QueryParamsResponse {
  /** params holds all the parameters of this module. */
  params: Params | undefined;
}

export interface QueryGetKYCCredentialRequest {
  did: string;
}

export interface QueryGetKYCCredentialResponse {
  kYCCredential: KYCCredential | undefined;
}

export interface QueryAllKYCCredentialRequest {
  pagination: PageRequest | undefined;
}

export interface QueryAllKYCCredentialResponse {
  kYCCredential: KYCCredential[];
  pagination: PageResponse | undefined;
}

export interface QueryGetDidRequest {
  address: string;
}

export interface QueryGetDidResponse {
  did: Did | undefined;
}

export interface QueryAllDidRequest {
  pagination: PageRequest | undefined;
}

export interface QueryAllDidResponse {
  did: Did[];
  pagination: PageResponse | undefined;
}

export interface QueryMeKycsRequest {
  regionid: string;
  pagination: PageRequest | undefined;
}

export interface QueryMeKycsResponse {
  KYCs: Credential[];
  pagination: PageResponse | undefined;
}

export interface QueryMeDidInfoRequest {
  pagination: PageRequest | undefined;
}

export interface QueryMeDidInfoResponse {
  infos: DidInfo[];
  pagination: PageResponse | undefined;
}

export interface QueryGetDidInfoRequest {
  did: string;
}

export interface QueryGetDidInfoResponse {
  didInfo: DidInfo | undefined;
}

export interface QueryAllDidInfoRequest {
  pagination: PageRequest | undefined;
}

export interface QueryAllDidInfoResponse {
  didInfo: DidInfo[];
  pagination: PageResponse | undefined;
}

function createBaseQueryParamsRequest(): QueryParamsRequest {
  return {};
}

export const QueryParamsRequest = {
  encode(_: QueryParamsRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): QueryParamsRequest {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryParamsRequest();
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

  fromJSON(_: any): QueryParamsRequest {
    return {};
  },

  toJSON(_: QueryParamsRequest): unknown {
    const obj: any = {};
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<QueryParamsRequest>, I>>(_: I): QueryParamsRequest {
    const message = createBaseQueryParamsRequest();
    return message;
  },
};

function createBaseQueryParamsResponse(): QueryParamsResponse {
  return { params: undefined };
}

export const QueryParamsResponse = {
  encode(message: QueryParamsResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.params !== undefined) {
      Params.encode(message.params, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): QueryParamsResponse {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryParamsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.params = Params.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): QueryParamsResponse {
    return { params: isSet(object.params) ? Params.fromJSON(object.params) : undefined };
  },

  toJSON(message: QueryParamsResponse): unknown {
    const obj: any = {};
    message.params !== undefined && (obj.params = message.params ? Params.toJSON(message.params) : undefined);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<QueryParamsResponse>, I>>(object: I): QueryParamsResponse {
    const message = createBaseQueryParamsResponse();
    message.params = (object.params !== undefined && object.params !== null)
      ? Params.fromPartial(object.params)
      : undefined;
    return message;
  },
};

function createBaseQueryGetKYCCredentialRequest(): QueryGetKYCCredentialRequest {
  return { did: "" };
}

export const QueryGetKYCCredentialRequest = {
  encode(message: QueryGetKYCCredentialRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.did !== "") {
      writer.uint32(10).string(message.did);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): QueryGetKYCCredentialRequest {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetKYCCredentialRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.did = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): QueryGetKYCCredentialRequest {
    return { did: isSet(object.did) ? String(object.did) : "" };
  },

  toJSON(message: QueryGetKYCCredentialRequest): unknown {
    const obj: any = {};
    message.did !== undefined && (obj.did = message.did);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<QueryGetKYCCredentialRequest>, I>>(object: I): QueryGetKYCCredentialRequest {
    const message = createBaseQueryGetKYCCredentialRequest();
    message.did = object.did ?? "";
    return message;
  },
};

function createBaseQueryGetKYCCredentialResponse(): QueryGetKYCCredentialResponse {
  return { kYCCredential: undefined };
}

export const QueryGetKYCCredentialResponse = {
  encode(message: QueryGetKYCCredentialResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.kYCCredential !== undefined) {
      KYCCredential.encode(message.kYCCredential, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): QueryGetKYCCredentialResponse {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetKYCCredentialResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.kYCCredential = KYCCredential.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): QueryGetKYCCredentialResponse {
    return { kYCCredential: isSet(object.kYCCredential) ? KYCCredential.fromJSON(object.kYCCredential) : undefined };
  },

  toJSON(message: QueryGetKYCCredentialResponse): unknown {
    const obj: any = {};
    message.kYCCredential !== undefined
      && (obj.kYCCredential = message.kYCCredential ? KYCCredential.toJSON(message.kYCCredential) : undefined);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<QueryGetKYCCredentialResponse>, I>>(
    object: I,
  ): QueryGetKYCCredentialResponse {
    const message = createBaseQueryGetKYCCredentialResponse();
    message.kYCCredential = (object.kYCCredential !== undefined && object.kYCCredential !== null)
      ? KYCCredential.fromPartial(object.kYCCredential)
      : undefined;
    return message;
  },
};

function createBaseQueryAllKYCCredentialRequest(): QueryAllKYCCredentialRequest {
  return { pagination: undefined };
}

export const QueryAllKYCCredentialRequest = {
  encode(message: QueryAllKYCCredentialRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): QueryAllKYCCredentialRequest {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAllKYCCredentialRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): QueryAllKYCCredentialRequest {
    return { pagination: isSet(object.pagination) ? PageRequest.fromJSON(object.pagination) : undefined };
  },

  toJSON(message: QueryAllKYCCredentialRequest): unknown {
    const obj: any = {};
    message.pagination !== undefined
      && (obj.pagination = message.pagination ? PageRequest.toJSON(message.pagination) : undefined);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<QueryAllKYCCredentialRequest>, I>>(object: I): QueryAllKYCCredentialRequest {
    const message = createBaseQueryAllKYCCredentialRequest();
    message.pagination = (object.pagination !== undefined && object.pagination !== null)
      ? PageRequest.fromPartial(object.pagination)
      : undefined;
    return message;
  },
};

function createBaseQueryAllKYCCredentialResponse(): QueryAllKYCCredentialResponse {
  return { kYCCredential: [], pagination: undefined };
}

export const QueryAllKYCCredentialResponse = {
  encode(message: QueryAllKYCCredentialResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.kYCCredential) {
      KYCCredential.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): QueryAllKYCCredentialResponse {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAllKYCCredentialResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.kYCCredential.push(KYCCredential.decode(reader, reader.uint32()));
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): QueryAllKYCCredentialResponse {
    return {
      kYCCredential: Array.isArray(object?.kYCCredential)
        ? object.kYCCredential.map((e: any) => KYCCredential.fromJSON(e))
        : [],
      pagination: isSet(object.pagination) ? PageResponse.fromJSON(object.pagination) : undefined,
    };
  },

  toJSON(message: QueryAllKYCCredentialResponse): unknown {
    const obj: any = {};
    if (message.kYCCredential) {
      obj.kYCCredential = message.kYCCredential.map((e) => e ? KYCCredential.toJSON(e) : undefined);
    } else {
      obj.kYCCredential = [];
    }
    message.pagination !== undefined
      && (obj.pagination = message.pagination ? PageResponse.toJSON(message.pagination) : undefined);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<QueryAllKYCCredentialResponse>, I>>(
    object: I,
  ): QueryAllKYCCredentialResponse {
    const message = createBaseQueryAllKYCCredentialResponse();
    message.kYCCredential = object.kYCCredential?.map((e) => KYCCredential.fromPartial(e)) || [];
    message.pagination = (object.pagination !== undefined && object.pagination !== null)
      ? PageResponse.fromPartial(object.pagination)
      : undefined;
    return message;
  },
};

function createBaseQueryGetDidRequest(): QueryGetDidRequest {
  return { address: "" };
}

export const QueryGetDidRequest = {
  encode(message: QueryGetDidRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.address !== "") {
      writer.uint32(10).string(message.address);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): QueryGetDidRequest {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetDidRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.address = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): QueryGetDidRequest {
    return { address: isSet(object.address) ? String(object.address) : "" };
  },

  toJSON(message: QueryGetDidRequest): unknown {
    const obj: any = {};
    message.address !== undefined && (obj.address = message.address);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<QueryGetDidRequest>, I>>(object: I): QueryGetDidRequest {
    const message = createBaseQueryGetDidRequest();
    message.address = object.address ?? "";
    return message;
  },
};

function createBaseQueryGetDidResponse(): QueryGetDidResponse {
  return { did: undefined };
}

export const QueryGetDidResponse = {
  encode(message: QueryGetDidResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.did !== undefined) {
      Did.encode(message.did, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): QueryGetDidResponse {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetDidResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.did = Did.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): QueryGetDidResponse {
    return { did: isSet(object.did) ? Did.fromJSON(object.did) : undefined };
  },

  toJSON(message: QueryGetDidResponse): unknown {
    const obj: any = {};
    message.did !== undefined && (obj.did = message.did ? Did.toJSON(message.did) : undefined);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<QueryGetDidResponse>, I>>(object: I): QueryGetDidResponse {
    const message = createBaseQueryGetDidResponse();
    message.did = (object.did !== undefined && object.did !== null) ? Did.fromPartial(object.did) : undefined;
    return message;
  },
};

function createBaseQueryAllDidRequest(): QueryAllDidRequest {
  return { pagination: undefined };
}

export const QueryAllDidRequest = {
  encode(message: QueryAllDidRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): QueryAllDidRequest {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAllDidRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): QueryAllDidRequest {
    return { pagination: isSet(object.pagination) ? PageRequest.fromJSON(object.pagination) : undefined };
  },

  toJSON(message: QueryAllDidRequest): unknown {
    const obj: any = {};
    message.pagination !== undefined
      && (obj.pagination = message.pagination ? PageRequest.toJSON(message.pagination) : undefined);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<QueryAllDidRequest>, I>>(object: I): QueryAllDidRequest {
    const message = createBaseQueryAllDidRequest();
    message.pagination = (object.pagination !== undefined && object.pagination !== null)
      ? PageRequest.fromPartial(object.pagination)
      : undefined;
    return message;
  },
};

function createBaseQueryAllDidResponse(): QueryAllDidResponse {
  return { did: [], pagination: undefined };
}

export const QueryAllDidResponse = {
  encode(message: QueryAllDidResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.did) {
      Did.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): QueryAllDidResponse {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAllDidResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.did.push(Did.decode(reader, reader.uint32()));
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): QueryAllDidResponse {
    return {
      did: Array.isArray(object?.did) ? object.did.map((e: any) => Did.fromJSON(e)) : [],
      pagination: isSet(object.pagination) ? PageResponse.fromJSON(object.pagination) : undefined,
    };
  },

  toJSON(message: QueryAllDidResponse): unknown {
    const obj: any = {};
    if (message.did) {
      obj.did = message.did.map((e) => e ? Did.toJSON(e) : undefined);
    } else {
      obj.did = [];
    }
    message.pagination !== undefined
      && (obj.pagination = message.pagination ? PageResponse.toJSON(message.pagination) : undefined);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<QueryAllDidResponse>, I>>(object: I): QueryAllDidResponse {
    const message = createBaseQueryAllDidResponse();
    message.did = object.did?.map((e) => Did.fromPartial(e)) || [];
    message.pagination = (object.pagination !== undefined && object.pagination !== null)
      ? PageResponse.fromPartial(object.pagination)
      : undefined;
    return message;
  },
};

function createBaseQueryMeKycsRequest(): QueryMeKycsRequest {
  return { regionid: "", pagination: undefined };
}

export const QueryMeKycsRequest = {
  encode(message: QueryMeKycsRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.regionid !== "") {
      writer.uint32(10).string(message.regionid);
    }
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): QueryMeKycsRequest {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryMeKycsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.regionid = reader.string();
          break;
        case 2:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): QueryMeKycsRequest {
    return {
      regionid: isSet(object.regionid) ? String(object.regionid) : "",
      pagination: isSet(object.pagination) ? PageRequest.fromJSON(object.pagination) : undefined,
    };
  },

  toJSON(message: QueryMeKycsRequest): unknown {
    const obj: any = {};
    message.regionid !== undefined && (obj.regionid = message.regionid);
    message.pagination !== undefined
      && (obj.pagination = message.pagination ? PageRequest.toJSON(message.pagination) : undefined);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<QueryMeKycsRequest>, I>>(object: I): QueryMeKycsRequest {
    const message = createBaseQueryMeKycsRequest();
    message.regionid = object.regionid ?? "";
    message.pagination = (object.pagination !== undefined && object.pagination !== null)
      ? PageRequest.fromPartial(object.pagination)
      : undefined;
    return message;
  },
};

function createBaseQueryMeKycsResponse(): QueryMeKycsResponse {
  return { KYCs: [], pagination: undefined };
}

export const QueryMeKycsResponse = {
  encode(message: QueryMeKycsResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.KYCs) {
      Credential.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): QueryMeKycsResponse {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryMeKycsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.KYCs.push(Credential.decode(reader, reader.uint32()));
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): QueryMeKycsResponse {
    return {
      KYCs: Array.isArray(object?.KYCs) ? object.KYCs.map((e: any) => Credential.fromJSON(e)) : [],
      pagination: isSet(object.pagination) ? PageResponse.fromJSON(object.pagination) : undefined,
    };
  },

  toJSON(message: QueryMeKycsResponse): unknown {
    const obj: any = {};
    if (message.KYCs) {
      obj.KYCs = message.KYCs.map((e) => e ? Credential.toJSON(e) : undefined);
    } else {
      obj.KYCs = [];
    }
    message.pagination !== undefined
      && (obj.pagination = message.pagination ? PageResponse.toJSON(message.pagination) : undefined);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<QueryMeKycsResponse>, I>>(object: I): QueryMeKycsResponse {
    const message = createBaseQueryMeKycsResponse();
    message.KYCs = object.KYCs?.map((e) => Credential.fromPartial(e)) || [];
    message.pagination = (object.pagination !== undefined && object.pagination !== null)
      ? PageResponse.fromPartial(object.pagination)
      : undefined;
    return message;
  },
};

function createBaseQueryMeDidInfoRequest(): QueryMeDidInfoRequest {
  return { pagination: undefined };
}

export const QueryMeDidInfoRequest = {
  encode(message: QueryMeDidInfoRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): QueryMeDidInfoRequest {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryMeDidInfoRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): QueryMeDidInfoRequest {
    return { pagination: isSet(object.pagination) ? PageRequest.fromJSON(object.pagination) : undefined };
  },

  toJSON(message: QueryMeDidInfoRequest): unknown {
    const obj: any = {};
    message.pagination !== undefined
      && (obj.pagination = message.pagination ? PageRequest.toJSON(message.pagination) : undefined);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<QueryMeDidInfoRequest>, I>>(object: I): QueryMeDidInfoRequest {
    const message = createBaseQueryMeDidInfoRequest();
    message.pagination = (object.pagination !== undefined && object.pagination !== null)
      ? PageRequest.fromPartial(object.pagination)
      : undefined;
    return message;
  },
};

function createBaseQueryMeDidInfoResponse(): QueryMeDidInfoResponse {
  return { infos: [], pagination: undefined };
}

export const QueryMeDidInfoResponse = {
  encode(message: QueryMeDidInfoResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.infos) {
      DidInfo.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): QueryMeDidInfoResponse {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryMeDidInfoResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.infos.push(DidInfo.decode(reader, reader.uint32()));
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): QueryMeDidInfoResponse {
    return {
      infos: Array.isArray(object?.infos) ? object.infos.map((e: any) => DidInfo.fromJSON(e)) : [],
      pagination: isSet(object.pagination) ? PageResponse.fromJSON(object.pagination) : undefined,
    };
  },

  toJSON(message: QueryMeDidInfoResponse): unknown {
    const obj: any = {};
    if (message.infos) {
      obj.infos = message.infos.map((e) => e ? DidInfo.toJSON(e) : undefined);
    } else {
      obj.infos = [];
    }
    message.pagination !== undefined
      && (obj.pagination = message.pagination ? PageResponse.toJSON(message.pagination) : undefined);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<QueryMeDidInfoResponse>, I>>(object: I): QueryMeDidInfoResponse {
    const message = createBaseQueryMeDidInfoResponse();
    message.infos = object.infos?.map((e) => DidInfo.fromPartial(e)) || [];
    message.pagination = (object.pagination !== undefined && object.pagination !== null)
      ? PageResponse.fromPartial(object.pagination)
      : undefined;
    return message;
  },
};

function createBaseQueryGetDidInfoRequest(): QueryGetDidInfoRequest {
  return { did: "" };
}

export const QueryGetDidInfoRequest = {
  encode(message: QueryGetDidInfoRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.did !== "") {
      writer.uint32(10).string(message.did);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): QueryGetDidInfoRequest {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetDidInfoRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.did = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): QueryGetDidInfoRequest {
    return { did: isSet(object.did) ? String(object.did) : "" };
  },

  toJSON(message: QueryGetDidInfoRequest): unknown {
    const obj: any = {};
    message.did !== undefined && (obj.did = message.did);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<QueryGetDidInfoRequest>, I>>(object: I): QueryGetDidInfoRequest {
    const message = createBaseQueryGetDidInfoRequest();
    message.did = object.did ?? "";
    return message;
  },
};

function createBaseQueryGetDidInfoResponse(): QueryGetDidInfoResponse {
  return { didInfo: undefined };
}

export const QueryGetDidInfoResponse = {
  encode(message: QueryGetDidInfoResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.didInfo !== undefined) {
      DidInfo.encode(message.didInfo, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): QueryGetDidInfoResponse {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetDidInfoResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.didInfo = DidInfo.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): QueryGetDidInfoResponse {
    return { didInfo: isSet(object.didInfo) ? DidInfo.fromJSON(object.didInfo) : undefined };
  },

  toJSON(message: QueryGetDidInfoResponse): unknown {
    const obj: any = {};
    message.didInfo !== undefined && (obj.didInfo = message.didInfo ? DidInfo.toJSON(message.didInfo) : undefined);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<QueryGetDidInfoResponse>, I>>(object: I): QueryGetDidInfoResponse {
    const message = createBaseQueryGetDidInfoResponse();
    message.didInfo = (object.didInfo !== undefined && object.didInfo !== null)
      ? DidInfo.fromPartial(object.didInfo)
      : undefined;
    return message;
  },
};

function createBaseQueryAllDidInfoRequest(): QueryAllDidInfoRequest {
  return { pagination: undefined };
}

export const QueryAllDidInfoRequest = {
  encode(message: QueryAllDidInfoRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): QueryAllDidInfoRequest {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAllDidInfoRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): QueryAllDidInfoRequest {
    return { pagination: isSet(object.pagination) ? PageRequest.fromJSON(object.pagination) : undefined };
  },

  toJSON(message: QueryAllDidInfoRequest): unknown {
    const obj: any = {};
    message.pagination !== undefined
      && (obj.pagination = message.pagination ? PageRequest.toJSON(message.pagination) : undefined);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<QueryAllDidInfoRequest>, I>>(object: I): QueryAllDidInfoRequest {
    const message = createBaseQueryAllDidInfoRequest();
    message.pagination = (object.pagination !== undefined && object.pagination !== null)
      ? PageRequest.fromPartial(object.pagination)
      : undefined;
    return message;
  },
};

function createBaseQueryAllDidInfoResponse(): QueryAllDidInfoResponse {
  return { didInfo: [], pagination: undefined };
}

export const QueryAllDidInfoResponse = {
  encode(message: QueryAllDidInfoResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.didInfo) {
      DidInfo.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): QueryAllDidInfoResponse {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAllDidInfoResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.didInfo.push(DidInfo.decode(reader, reader.uint32()));
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): QueryAllDidInfoResponse {
    return {
      didInfo: Array.isArray(object?.didInfo) ? object.didInfo.map((e: any) => DidInfo.fromJSON(e)) : [],
      pagination: isSet(object.pagination) ? PageResponse.fromJSON(object.pagination) : undefined,
    };
  },

  toJSON(message: QueryAllDidInfoResponse): unknown {
    const obj: any = {};
    if (message.didInfo) {
      obj.didInfo = message.didInfo.map((e) => e ? DidInfo.toJSON(e) : undefined);
    } else {
      obj.didInfo = [];
    }
    message.pagination !== undefined
      && (obj.pagination = message.pagination ? PageResponse.toJSON(message.pagination) : undefined);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<QueryAllDidInfoResponse>, I>>(object: I): QueryAllDidInfoResponse {
    const message = createBaseQueryAllDidInfoResponse();
    message.didInfo = object.didInfo?.map((e) => DidInfo.fromPartial(e)) || [];
    message.pagination = (object.pagination !== undefined && object.pagination !== null)
      ? PageResponse.fromPartial(object.pagination)
      : undefined;
    return message;
  },
};

/** Query defines the gRPC querier service. */
export interface Query {
  /** Parameters queries the parameters of the module. */
  Params(request: QueryParamsRequest): Promise<QueryParamsResponse>;
  /** Queries a list of KYCCredential items. */
  KYCCredential(request: QueryGetKYCCredentialRequest): Promise<QueryGetKYCCredentialResponse>;
  KYCCredentialAll(request: QueryAllKYCCredentialRequest): Promise<QueryAllKYCCredentialResponse>;
  /** Queries a list of Did items. */
  Did(request: QueryGetDidRequest): Promise<QueryGetDidResponse>;
  DidAll(request: QueryAllDidRequest): Promise<QueryAllDidResponse>;
  /** Queries a list of DidInfo items. */
  DidInfo(request: QueryGetDidInfoRequest): Promise<QueryGetDidInfoResponse>;
  DidInfoAll(request: QueryAllDidInfoRequest): Promise<QueryAllDidInfoResponse>;
}

export class QueryClientImpl implements Query {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.Params = this.Params.bind(this);
    this.KYCCredential = this.KYCCredential.bind(this);
    this.KYCCredentialAll = this.KYCCredentialAll.bind(this);
    this.Did = this.Did.bind(this);
    this.DidAll = this.DidAll.bind(this);
    this.DidInfo = this.DidInfo.bind(this);
    this.DidInfoAll = this.DidInfoAll.bind(this);
  }
  Params(request: QueryParamsRequest): Promise<QueryParamsResponse> {
    const data = QueryParamsRequest.encode(request).finish();
    const promise = this.rpc.request("stchain.rollapp.kyc.Query", "Params", data);
    return promise.then((data) => QueryParamsResponse.decode(new _m0.Reader(data)));
  }

  KYCCredential(request: QueryGetKYCCredentialRequest): Promise<QueryGetKYCCredentialResponse> {
    const data = QueryGetKYCCredentialRequest.encode(request).finish();
    const promise = this.rpc.request("stchain.rollapp.kyc.Query", "KYCCredential", data);
    return promise.then((data) => QueryGetKYCCredentialResponse.decode(new _m0.Reader(data)));
  }

  KYCCredentialAll(request: QueryAllKYCCredentialRequest): Promise<QueryAllKYCCredentialResponse> {
    const data = QueryAllKYCCredentialRequest.encode(request).finish();
    const promise = this.rpc.request("stchain.rollapp.kyc.Query", "KYCCredentialAll", data);
    return promise.then((data) => QueryAllKYCCredentialResponse.decode(new _m0.Reader(data)));
  }

  Did(request: QueryGetDidRequest): Promise<QueryGetDidResponse> {
    const data = QueryGetDidRequest.encode(request).finish();
    const promise = this.rpc.request("stchain.rollapp.kyc.Query", "Did", data);
    return promise.then((data) => QueryGetDidResponse.decode(new _m0.Reader(data)));
  }

  DidAll(request: QueryAllDidRequest): Promise<QueryAllDidResponse> {
    const data = QueryAllDidRequest.encode(request).finish();
    const promise = this.rpc.request("stchain.rollapp.kyc.Query", "DidAll", data);
    return promise.then((data) => QueryAllDidResponse.decode(new _m0.Reader(data)));
  }

  DidInfo(request: QueryGetDidInfoRequest): Promise<QueryGetDidInfoResponse> {
    const data = QueryGetDidInfoRequest.encode(request).finish();
    const promise = this.rpc.request("stchain.rollapp.kyc.Query", "DidInfo", data);
    return promise.then((data) => QueryGetDidInfoResponse.decode(new _m0.Reader(data)));
  }

  DidInfoAll(request: QueryAllDidInfoRequest): Promise<QueryAllDidInfoResponse> {
    const data = QueryAllDidInfoRequest.encode(request).finish();
    const promise = this.rpc.request("stchain.rollapp.kyc.Query", "DidInfoAll", data);
    return promise.then((data) => QueryAllDidInfoResponse.decode(new _m0.Reader(data)));
  }
}

interface Rpc {
  request(service: string, method: string, data: Uint8Array): Promise<Uint8Array>;
}

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
