# Scan Report: Waitlists
> Scanned: 2026-03-12 | Scanner: Automation 1 — Phase 7

## 1. Touchpoints Inventory

### Pages
- `src/pages/WaitlistEntries.tsx` — Entries management: search, bulk invite, delete, CSV/email export

### Components
- `src/components/waitlist/WaitlistLandingPage.tsx` — Public signup: email, name, referral code, share buttons
- `src/components/waitlist/WaitlistDashboard.tsx` — Admin: stats cards, growth chart, referral leaderboard, source breakdown

### Hooks
- `src/hooks/useWaitlist.ts` — CRUD + realtime (INSERT/UPDATE/DELETE) + bulk invite + CSV export
- `src/hooks/useWaitlistAnalytics.ts` — Computed stats: total, today, thisWeek, referralRate, dailySignups, leaderboard

### Database Tables
- `waitlist_entries` — RLS: member read, public insert (if form active + mode=waitlist). Triggers: auto-position, referral count. Realtime: yes
- `waitlist_invites` — RLS: member access. No triggers. Realtime: no

### Lib
- `src/lib/referralCode.ts` — Crypto-random 8-char codes (Base58-like charset)

### Routes
- `/forms/:id` — Protected, WaitlistDashboard (when mode=waitlist)
- `/forms/:id/entries` — Protected, WaitlistEntries
- `/f/:id?ref=CODE` — Public, WaitlistLandingPage (with optional referral code)

## 2. End-to-End Flow Status

- **Public signup → position assignment → referral code**: WORKS — insert entry, trigger assigns position, client generates referral code
- **Referral tracking (referred_by → referral_count)**: WORKS — DB trigger increments referrer's count + client calls RPC
- **Share referral link (Twitter/WhatsApp)**: WORKS — copy link, social share buttons
- **Duplicate email detection**: WORKS — checks existing entry by form_id + email before insert
- **Admin: view entries + search + filter**: WORKS — useWaitlist fetches with realtime updates
- **Admin: bulk invite with message**: WORKS — marks as invited + creates invite records
- **Admin: CSV export + email-only export**: WORKS — client-side CSV generation
- **Dashboard: growth chart + leaderboard**: WORKS — useMemo analytics from entries data
- **Realtime updates on new signups**: WORKS — channel watches INSERT/UPDATE/DELETE on waitlist_entries

## 3. Business Tier Mapping

| Tier | Access | Limit | Enforced |
|------|--------|-------|----------|
| Free | 1 waitlist form | 1 waitlist, 100 submissions/mo | YES — client-side |
| Pro | 3 waitlist forms | 3 waitlists, 5k subs/mo | YES — client-side |
| Growth | Unlimited | Unlimited waitlists, 25k subs/mo | YES — client-side |
| Business | Unlimited | Unlimited | YES — client-side |

## 4. Cross-Dependencies

- **Depends on**: Auth (01), Plan Limits (04), Forms (05) — waitlist is a form mode
- **Depended on by**: Webhooks (10) — WAITLIST_SIGNUP event, Integrations (11) — Slack + Mailchimp sync, Workflows (15) — waitlist_milestone trigger
- **Shared files**: None (isolated components)

## 5. i18n Status

- t() coverage: ALL strings wrapped (waitlist.*)
- Hebrew translations: COMPLETE
- RTL layout: CORRECT

## 6. Parallelism Eligibility

- Independent: YES (after Batch 1 complete)
- Conflicts with: None

## 7. Issues Found

### P0 — Critical
- None

### P1 — High
- None

### P2 — Medium
- **Position calculation client+server**: WaitlistLandingPage queries max position client-side AND trigger auto-assigns position. Potential race condition with concurrent signups (trigger should win). File: `src/components/waitlist/WaitlistLandingPage.tsx`
- **referral_boost setting stored but not applied**: Settings include `referral_boost` (spots gained per referral) but no code moves entries up. File: waitlist settings in form.settings JSONB

## 8. Recommended Fix Path

1. Remove client-side position calculation (trust DB trigger exclusively)
2. Implement referral_boost logic if desired (re-order entries when referral count increases)
