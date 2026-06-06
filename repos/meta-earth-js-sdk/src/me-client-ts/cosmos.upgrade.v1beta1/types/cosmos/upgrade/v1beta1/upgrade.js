/* eslint-disable */
import Long from 'long'
import _m0 from 'protobufjs/minimal'
import { Any } from '../../../google/protobuf/any'
import { Timestamp } from '../../../google/protobuf/timestamp'
export const protobufPackage = 'cosmos.upgrade.v1beta1'
function createBasePlan() {
  return { name: '', time: undefined, height: 0, info: '', upgradedClientState: undefined }
}
export const Plan = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.name !== '') {
      writer.uint32(10).string(message.name)
    }
    if (message.time !== undefined) {
      Timestamp.encode(toTimestamp(message.time), writer.uint32(18).fork()).ldelim()
    }
    if (message.height !== 0) {
      writer.uint32(24).int64(message.height)
    }
    if (message.info !== '') {
      writer.uint32(34).string(message.info)
    }
    if (message.upgradedClientState !== undefined) {
      Any.encode(message.upgradedClientState, writer.uint32(42).fork()).ldelim()
    }
    return writer
  },
  decode(input, length) {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = createBasePlan()
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.name = reader.string()
          break
        case 2:
          message.time = fromTimestamp(Timestamp.decode(reader, reader.uint32()))
          break
        case 3:
          message.height = longToNumber(reader.int64())
          break
        case 4:
          message.info = reader.string()
          break
        case 5:
          message.upgradedClientState = Any.decode(reader, reader.uint32())
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },
  fromJSON(object) {
    return {
      name: isSet(object.name) ? String(object.name) : '',
      time: isSet(object.time) ? fromJsonTimestamp(object.time) : undefined,
      height: isSet(object.height) ? Number(object.height) : 0,
      info: isSet(object.info) ? String(object.info) : '',
      upgradedClientState: isSet(object.upgradedClientState)
        ? Any.fromJSON(object.upgradedClientState)
        : undefined,
    }
  },
  toJSON(message) {
    const obj = {}
    message.name !== undefined && (obj.name = message.name)
    message.time !== undefined && (obj.time = message.time.toISOString())
    message.height !== undefined && (obj.height = Math.round(message.height))
    message.info !== undefined && (obj.info = message.info)
    message.upgradedClientState !== undefined &&
      (obj.upgradedClientState = message.upgradedClientState
        ? Any.toJSON(message.upgradedClientState)
        : undefined)
    return obj
  },
  fromPartial(object) {
    const message = createBasePlan()
    message.name = object.name ?? ''
    message.time = object.time ?? undefined
    message.height = object.height ?? 0
    message.info = object.info ?? ''
    message.upgradedClientState =
      object.upgradedClientState !== undefined && object.upgradedClientState !== null
        ? Any.fromPartial(object.upgradedClientState)
        : undefined
    return message
  },
}
function createBaseSoftwareUpgradeProposal() {
  return { title: '', description: '', plan: undefined }
}
export const SoftwareUpgradeProposal = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.title !== '') {
      writer.uint32(10).string(message.title)
    }
    if (message.description !== '') {
      writer.uint32(18).string(message.description)
    }
    if (message.plan !== undefined) {
      Plan.encode(message.plan, writer.uint32(26).fork()).ldelim()
    }
    return writer
  },
  decode(input, length) {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = createBaseSoftwareUpgradeProposal()
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.title = reader.string()
          break
        case 2:
          message.description = reader.string()
          break
        case 3:
          message.plan = Plan.decode(reader, reader.uint32())
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },
  fromJSON(object) {
    return {
      title: isSet(object.title) ? String(object.title) : '',
      description: isSet(object.description) ? String(object.description) : '',
      plan: isSet(object.plan) ? Plan.fromJSON(object.plan) : undefined,
    }
  },
  toJSON(message) {
    const obj = {}
    message.title !== undefined && (obj.title = message.title)
    message.description !== undefined && (obj.description = message.description)
    message.plan !== undefined && (obj.plan = message.plan ? Plan.toJSON(message.plan) : undefined)
    return obj
  },
  fromPartial(object) {
    const message = createBaseSoftwareUpgradeProposal()
    message.title = object.title ?? ''
    message.description = object.description ?? ''
    message.plan =
      object.plan !== undefined && object.plan !== null ? Plan.fromPartial(object.plan) : undefined
    return message
  },
}
function createBaseCancelSoftwareUpgradeProposal() {
  return { title: '', description: '' }
}
export const CancelSoftwareUpgradeProposal = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.title !== '') {
      writer.uint32(10).string(message.title)
    }
    if (message.description !== '') {
      writer.uint32(18).string(message.description)
    }
    return writer
  },
  decode(input, length) {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = createBaseCancelSoftwareUpgradeProposal()
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.title = reader.string()
          break
        case 2:
          message.description = reader.string()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },
  fromJSON(object) {
    return {
      title: isSet(object.title) ? String(object.title) : '',
      description: isSet(object.description) ? String(object.description) : '',
    }
  },
  toJSON(message) {
    const obj = {}
    message.title !== undefined && (obj.title = message.title)
    message.description !== undefined && (obj.description = message.description)
    return obj
  },
  fromPartial(object) {
    const message = createBaseCancelSoftwareUpgradeProposal()
    message.title = object.title ?? ''
    message.description = object.description ?? ''
    return message
  },
}
function createBaseModuleVersion() {
  return { name: '', version: 0 }
}
export const ModuleVersion = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.name !== '') {
      writer.uint32(10).string(message.name)
    }
    if (message.version !== 0) {
      writer.uint32(16).uint64(message.version)
    }
    return writer
  },
  decode(input, length) {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = createBaseModuleVersion()
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.name = reader.string()
          break
        case 2:
          message.version = longToNumber(reader.uint64())
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },
  fromJSON(object) {
    return {
      name: isSet(object.name) ? String(object.name) : '',
      version: isSet(object.version) ? Number(object.version) : 0,
    }
  },
  toJSON(message) {
    const obj = {}
    message.name !== undefined && (obj.name = message.name)
    message.version !== undefined && (obj.version = Math.round(message.version))
    return obj
  },
  fromPartial(object) {
    const message = createBaseModuleVersion()
    message.name = object.name ?? ''
    message.version = object.version ?? 0
    return message
  },
}
var globalThis = (() => {
  if (typeof globalThis !== 'undefined') {
    return globalThis
  }
  if (typeof self !== 'undefined') {
    return self
  }
  if (typeof window !== 'undefined') {
    return window
  }
  if (typeof global !== 'undefined') {
    return global
  }
  throw 'Unable to locate global object'
})()
function toTimestamp(date) {
  const seconds = date.getTime() / 1000
  const nanos = (date.getTime() % 1000) * 1000000
  return { seconds, nanos }
}
function fromTimestamp(t) {
  let millis = t.seconds * 1000
  millis += t.nanos / 1000000
  return new Date(millis)
}
function fromJsonTimestamp(o) {
  if (o instanceof Date) {
    return o
  } else if (typeof o === 'string') {
    return new Date(o)
  } else {
    return fromTimestamp(Timestamp.fromJSON(o))
  }
}
function longToNumber(long) {
  if (long.gt(Number.MAX_SAFE_INTEGER)) {
    throw new globalThis.Error('Value is larger than Number.MAX_SAFE_INTEGER')
  }
  return long.toNumber()
}
if (_m0.util.Long !== Long) {
  _m0.util.Long = Long
  _m0.configure()
}
function isSet(value) {
  return value !== null && value !== undefined
}
