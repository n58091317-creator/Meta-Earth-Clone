---
name: protobufjs encoding — use GeneratedType-compatible objects
description: Must use protobufjs/minimal _m0.Writer inline objects (not protobufjs.Type) for cosmjs registry. Type.fromObject() approach causes cosmjs to produce malformed Any.value bytes.
---

## Rule
Always use `protobufjs/minimal` `_m0.Writer`-based inline objects as cosmjs `GeneratedType`, NOT `protobufjs.Type` objects.

**Correct pattern (from ts-client):**
```typescript
import _m0 from 'protobufjs/minimal';

const MyMsgType = {
  encode(msg: MyMsg, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (msg.field1 !== '') writer.uint32(10).string(msg.field1);
    if (msg.field2 !== '') writer.uint32(18).string(msg.field2);
    return writer;
  },
  decode(input: _m0.Reader | Uint8Array, length?: number): MyMsg { ... },
  fromPartial(obj: Partial<MyMsg>): MyMsg { return { field1: obj.field1 ?? '', ... }; },
};
// Use fromPartial (not fromObject) when constructing message values:
const msg = { typeUrl: '/some.Msg', value: MyMsgType.fromPartial({ field1: 'x' }) };
```

**Wrong pattern:**
```typescript
import { Type, Field, Root } from 'protobufjs';
const T = new Type('Msg').add(new Field('field1', 1, 'string'));
// T.fromObject({...}) → produces incompatible message object
// cosmjs registry.encodeAsAny calls T.encode(value).finish() but the result
// may not be correctly embedded in the Any wrapper
```

**Why:** cosmjs `Registry.encodeAsAny` calls `type.encode(value).finish()`. With `protobufjs.Type`, `fromObject` creates a `Message` instance whose encoding can differ from what the chain expects. The `_m0.Writer` approach matches the ts-client generated code exactly.

**How to apply:** Whenever adding a new Cosmos message type to the cosmjs registry, copy the encode/decode/fromPartial pattern from the official ts-client. Reference: `repos/meta-earth/ts-client/mechain.checkin/types/mechain/checkin/tx.ts`.
