/* eslint-disable */
import _m0 from "protobufjs/minimal";
import { Credential } from "./credential";

export const protobufPackage = "stchain.rollapp.kyc";

export interface KYCCredential {
  did: string;
  credential: Credential | undefined;
}

function createBaseKYCCredential(): KYCCredential {
  return { did: "", credential: undefined };
}

export const KYCCredential = {
  encode(message: KYCCredential, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.did !== "") {
      writer.uint32(10).string(message.did);
    }
    if (message.credential !== undefined) {
      Credential.encode(message.credential, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): KYCCredential {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseKYCCredential();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.did = reader.string();
          break;
        case 2:
          message.credential = Credential.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): KYCCredential {
    return {
      did: isSet(object.did) ? String(object.did) : "",
      credential: isSet(object.credential) ? Credential.fromJSON(object.credential) : undefined,
    };
  },

  toJSON(message: KYCCredential): unknown {
    const obj: any = {};
    message.did !== undefined && (obj.did = message.did);
    message.credential !== undefined
      && (obj.credential = message.credential ? Credential.toJSON(message.credential) : undefined);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<KYCCredential>, I>>(object: I): KYCCredential {
    const message = createBaseKYCCredential();
    message.did = object.did ?? "";
    message.credential = (object.credential !== undefined && object.credential !== null)
      ? Credential.fromPartial(object.credential)
      : undefined;
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
