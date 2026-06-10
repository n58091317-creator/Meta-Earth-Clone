---
name: MsgNewRecord is Show E, NOT daily check-in
description: /metaearth.wstaking.MsgNewRecord on the hub is the "Show E" task module. Never use it for daily check-in.
---

## Rule
`/metaearth.wstaking.MsgNewRecord` on the hub chain (`me-chain`) is the **Show E task** module. Using it for daily check-in causes the Meta Earth app to record it as "Show E", not "Daily Sign-in".

**Why:**
- Confirmed by user feedback (2026-06-10): submitting MsgNewRecord with actionNumber "MEcheckin20260610" showed as "Show E" in the Meta Earth app, not as a daily check-in.
- The wstaking module handles all task/evidence records — the Meta Earth app labels them as "Show E" regardless of actionNumber content.
- The hub chain has no dedicated `checkin` module in `x/` — verified by listing `repos/me-hub/x/`.

**How to apply:**
- Never use `MsgNewRecord` for the daily check-in. Use it only if explicitly building Show E task automation.
- See `rollup-checkin-fields.md` for the correct daily check-in type.
