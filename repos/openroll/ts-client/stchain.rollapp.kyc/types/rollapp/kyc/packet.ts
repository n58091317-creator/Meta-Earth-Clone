/* eslint-disable */
import _m0 from "protobufjs/minimal";

export const protobufPackage = "stchain.rollapp.kyc";

export interface KycPacketData {
  noData: NoData | undefined;
  ibcKycPacket: IbcKycPacketData | undefined;
}

export interface NoData {
}

/** IbcKycPacketData defines a struct for the packet payload */
export interface IbcKycPacketData {
  address: string;
}

/** IbcKycPacketAck defines a struct for the packet acknowledgment */
export interface IbcKycPacketAck {
}

function createBaseKycPacketData(): KycPacketData {
  return { noData: undefined, ibcKycPacket: undefined };
}

export const KycPacketData = {
  encode(message: KycPacketData, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.noData !== undefined) {
      NoData.encode(message.noData, writer.uint32(10).fork()).ldelim();
    }
    if (message.ibcKycPacket !== undefined) {
      IbcKycPacketData.encode(message.ibcKycPacket, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): KycPacketData {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseKycPacketData();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.noData = NoData.decode(reader, reader.uint32());
          break;
        case 2:
          message.ibcKycPacket = IbcKycPacketData.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): KycPacketData {
    return {
      noData: isSet(object.noData) ? NoData.fromJSON(object.noData) : undefined,
      ibcKycPacket: isSet(object.ibcKycPacket) ? IbcKycPacketData.fromJSON(object.ibcKycPacket) : undefined,
    };
  },

  toJSON(message: KycPacketData): unknown {
    const obj: any = {};
    message.noData !== undefined && (obj.noData = message.noData ? NoData.toJSON(message.noData) : undefined);
    message.ibcKycPacket !== undefined
      && (obj.ibcKycPacket = message.ibcKycPacket ? IbcKycPacketData.toJSON(message.ibcKycPacket) : undefined);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<KycPacketData>, I>>(object: I): KycPacketData {
    const message = createBaseKycPacketData();
    message.noData = (object.noData !== undefined && object.noData !== null)
      ? NoData.fromPartial(object.noData)
      : undefined;
    message.ibcKycPacket = (object.ibcKycPacket !== undefined && object.ibcKycPacket !== null)
      ? IbcKycPacketData.fromPartial(object.ibcKycPacket)
      : undefined;
    return message;
  },
};

function createBaseNoData(): NoData {
  return {};
}

export const NoData = {
  encode(_: NoData, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): NoData {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseNoData();
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

  fromJSON(_: any): NoData {
    return {};
  },

  toJSON(_: NoData): unknown {
    const obj: any = {};
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<NoData>, I>>(_: I): NoData {
    const message = createBaseNoData();
    return message;
  },
};

function createBaseIbcKycPacketData(): IbcKycPacketData {
  return { address: "" };
}

export const IbcKycPacketData = {
  encode(message: IbcKycPacketData, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.address !== "") {
      writer.uint32(10).string(message.address);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): IbcKycPacketData {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseIbcKycPacketData();
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

  fromJSON(object: any): IbcKycPacketData {
    return { address: isSet(object.address) ? String(object.address) : "" };
  },

  toJSON(message: IbcKycPacketData): unknown {
    const obj: any = {};
    message.address !== undefined && (obj.address = message.address);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<IbcKycPacketData>, I>>(object: I): IbcKycPacketData {
    const message = createBaseIbcKycPacketData();
    message.address = object.address ?? "";
    return message;
  },
};

function createBaseIbcKycPacketAck(): IbcKycPacketAck {
  return {};
}

export const IbcKycPacketAck = {
  encode(_: IbcKycPacketAck, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): IbcKycPacketAck {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseIbcKycPacketAck();
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

  fromJSON(_: any): IbcKycPacketAck {
    return {};
  },

  toJSON(_: IbcKycPacketAck): unknown {
    const obj: any = {};
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<IbcKycPacketAck>, I>>(_: I): IbcKycPacketAck {
    const message = createBaseIbcKycPacketAck();
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
