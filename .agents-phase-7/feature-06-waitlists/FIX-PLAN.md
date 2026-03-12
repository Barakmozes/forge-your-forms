# Agent 27 — FIX-PLAN

## Assessment Summary

### P2-1: Position Calculation Duplicated Client+Server
**Status:** Confirmed
**Location:** `src/components/waitlist/WaitlistLandingPage.tsx` lines 119–128
**Issue:** Client queries `MAX(position)` before insert and passes `position: nextPosition` in the insert payload. However, the DB trigger `handle_waitlist_position()` (migration 004, lines 105–127) is a BEFORE INSERT trigger that **always** overrides `NEW.position` with the correct next value. The client-side calculation is:
- Redundant (trigger always wins)
- Wasteful (extra DB query on every signup)
- Misleading (suggests position must be provided)

**Note:** `useWaitlist.ts:addEntry` already does this correctly — it omits position and trusts the trigger.

**Fix:** Remove the max-position query (lines 119–128). Remove `position: nextPosition` from the insert payload. The `.select()` after insert already returns the DB-assigned position.

### P2-2: referral_boost Setting Stored But Not Applied
**Status:** Confirmed
**Location:** `src/components/waitlist/WaitlistLandingPage.tsx` lines 56, 442–447
**Issue:** `referral_boost` is read from `form.settings` and displayed as "each referral moves you up X spots" — but no code (client or server) actually re-orders positions when referral count increases. The trigger `handle_waitlist_referral()` only increments `referral_count`.

**Decision needed:** Implement position re-ordering (requires new DB function + trigger) or mark as "Coming Soon" / remove misleading UI text.

**Recommendation:** The text currently only appears when `referralBoost > 0`, which means it only shows when the form owner has explicitly configured it. Since the backend logic doesn't exist, this is misleading. Options:
1. **Defer & clarify:** Keep the setting but change the UI text to indicate the feature is coming soon
2. **Remove:** Delete the `referralBoost` variable and the UI block entirely

Will assess further in Prompt 27.2.

## Fix Order
1. **Prompt 27.1:** Remove client-side position query from `WaitlistLandingPage.tsx`
2. **Prompt 27.2:** Decide on referral_boost — document or remove
3. **Prompt 27.3:** Final verification
