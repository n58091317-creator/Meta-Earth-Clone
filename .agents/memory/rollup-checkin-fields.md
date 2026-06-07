---
name: Rollup MsgCheckIn fields
description: The rollup chain's MsgCheckIn has 2 fields; the hub chain has 3. They are different chains with different proto schemas.
---

There are two completely different chains and two different `MsgCheckIn` types:

1. **Rollup chain** (`mecheckin_101-1`, prefix `me`): `stchain.rollapp.checkin.MsgCheckIn`
   - Field 1: `checkInAddress` (string)
   - Field 2: `checkInMessage` (string)
   - **NO field 3**. Adding any field 3 (e.g., timezone) causes the chain to return `proto: wrong wireType = 2 for field RecoverInterruption: tx parse error`.

2. **Hub chain** (separate chain, prefix `gc` or `me-hub`): `mechain.checkin.MsgCheckIn`
   - Field 1: `checkInAddress` (string)
   - Field 2: `checkInMessage` (string)
   - Field 3: `checkInTimezone` (string) — ONLY on the hub chain

**Why:** Confirmed from `repos/meta-earth/ts-client/mechain.checkin/types/mechain/checkin/tx.ts` (hub) and live chain error responses (rollup). The `RecoverInterruption` error is a Dymint/rollup internal field at offset 3 in another message type that gets confused when an unexpected length-delimited field appears.

**How to apply:** When building `MsgCheckIn` for the rollup chain, define ONLY 2 proto fields. The hub chain's timezone field must never be copied to the rollup's message builder.
