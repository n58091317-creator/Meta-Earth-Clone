---
name: Rollup MsgCheckIn fields — OBSOLETE
description: The rollup chain stalled 2026-05-01 so MsgCheckIn on the rollup is no longer the active check-in. See hub-checkin-msgnewrecord.md.
---

## Status: OBSOLETE
The rollup chain (`mecheckin_101-1`) stopped producing blocks on 2026-05-01. Submitting `MsgCheckIn` to the rollup mempool returns a hash but the tx is never confirmed and never appears in the explorer.

The active daily check-in is now `MsgNewRecord` on the hub chain. See `hub-checkin-msgnewrecord.md`.

## Historical note
The correct rollup type URL was `/mechain.checkin.MsgCheckIn` (3 fields: checkInAddress, checkInMessage, checkInTimezone) from `repos/meta-earth/proto/mechain/checkin/tx.proto`. The old `/stchain.rollapp.checkin.MsgCheckIn` (2 fields) was wrong and caused "ShowE" appearance. This is now moot since the rollup is dead.
