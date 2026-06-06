/* eslint-disable */
import _m0 from "protobufjs/minimal";

export const protobufPackage = "stchain.rollapp.hubauth";

export interface MsgSetClientId {
  creator: string;
  clientId: string;
  denomPath: string;
}

export interface MsgSetClientIdResponse {
}

function createBaseMsgSetClientId(): MsgSetClientId {
  return { creator: "", clientId: "", denomPath: "" };
}

export const MsgSetClientId = {
  encode(message: MsgSetClientId, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.creator !== "") {
      writer.uint32(10).string(message.creator);
    }
    if (message.clientId !== "") {
      writer.uint32(18).string(message.clientId);
    }
    if (message.denomPath !== "") {
      writer.uint32(26).string(message.denomPath);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgSetClientId {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSetClientId();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.creator = reader.string();
          break;
        case 2:
          message.clientId = reader.string();
          break;
        case 3:
          message.denomPath = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): MsgSetClientId {
    return {
      creator: isSet(object.creator) ? String(object.creator) : "",
      clientId: isSet(object.clientId) ? String(object.clientId) : "",
      denomPath: isSet(object.denomPath) ? String(object.denomPath) : "",
    };
  },

  toJSON(message: MsgSetClientId): unknown {
    const obj: any = {};
    message.creator !== undefined && (obj.creator = message.creator);
    message.clientId !== undefined && (obj.clientId = message.clientId);
    message.denomPath !== undefined && (obj.denomPath = message.denomPath);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<MsgSetClientId>, I>>(object: I): MsgSetClientId {
    const message = createBaseMsgSetClientId();
    message.creator = object.creator ?? "";
    message.clientId = object.clientId ?? "";
    message.denomPath = object.denomPath ?? "";
    return message;
  },
};

function createBaseMsgSetClientIdResponse(): MsgSetClientIdResponse {
  return {};
}

export const MsgSetClientIdResponse = {
  encode(_: MsgSetClientIdResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgSetClientIdResponse {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSetClientIdResponse();
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

  fromJSON(_: any): MsgSetClientIdResponse {
    return {};
  },

  toJSON(_: MsgSetClientIdResponse): unknown {
    const obj: any = {};
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<MsgSetClientIdResponse>, I>>(_: I): MsgSetClientIdResponse {
    const message = createBaseMsgSetClientIdResponse();
    return message;
  },
};

/** Msg defines the Msg service. */
export interface Msg {
  SetClientId(request: MsgSetClientId): Promise<MsgSetClientIdResponse>;
}

export class MsgClientImpl implements Msg {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.SetClientId = this.SetClientId.bind(this);
  }
  SetClientId(request: MsgSetClientId): Promise<MsgSetClientIdResponse> {
    const data = MsgSetClientId.encode(request).finish();
    const promise = this.rpc.request("stchain.rollapp.hubauth.Msg", "SetClientId", data);
    return promise.then((data) => MsgSetClientIdResponse.decode(new _m0.Reader(data)));
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
