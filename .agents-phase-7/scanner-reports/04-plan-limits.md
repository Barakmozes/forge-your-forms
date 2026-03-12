# Scan Report: Plan Limits & Feature Gating
> Scanned: 2026-03-12 | Scanner: Automation 1 — Phase 7

## 1. Touchpoints Inventory

### Components
- `src/components/upgrade/FeatureGate.tsx` — Wrapper: blur + lock overlay + PaywallModal trigger
- `src/components/upgrade/PaywallModal.tsx` — Modal with upgrade CTA, plan-specific colors/benefits
- `src/components/upgrade/UpgradePrompt.tsx` — Inline card-based upgrade prompt (dashed border)
- `src/components/upgrade/UsageDashboard.tsx` — Visual usage bars + plan comparison table
- `src/components/billing/UpgradeButton.tsx` — Contextual upgrade button (hidden if plan sufficient)

### Hooks
- `src/hooks/usePlanLimits.ts` — Central gating logic: limits, mode requirements, feature gates
- `src/hooks/useSubscription.ts` — Plan tier resolution from subscriptions table
- `src/hooks/useUsage.ts` — Monthly usage counts (submissions, forms, members)

### Lib
- `src/lib/stripe.ts` — PLAN_FEATURES map, isPlanAtLeast() comparison

## 2. End-to-End Flow Status

- **Form creation gating** (canCreateForm): WORKS — checks mode requirement + form count limit
- **Submission limit check** (canAcceptSubmission): PARTIAL — client-only, no server enforcement
- **Member invite limit** (canInviteMember): PARTIAL — client-only, no RLS enforcement
- **Feature gate UI** (FeatureGate): WORKS — blurs content, shows lock, opens PaywallModal
- **Usage dashboard** (UsageDashboard): WORKS — progress bars, color-coded, plan comparison
- **Mode access check** (canAccessMode): WORKS — standard=free, waitlist=free, feedback=pro, support=growth
- **Feature access check** (canAccessFeature): WORKS — maps features to required plan tiers

## 3. Business Tier Mapping

| Feature | Free | Pro | Growth | Business |
|---------|------|-----|--------|----------|
| Max Forms | 3 | ∞ | ∞ | ∞ |
| Max Waitlists | 1 | 3 | ∞ | ∞ |
| Max Feedback Forms | 0 | 3 | ∞ | ∞ |
| Max Support Inboxes | 0 | 0 | 1 | ∞ |
| Submissions/mo | 100 | 5k | 25k | ∞ |
| Members | 1 | 3 | 10 | ∞ |
| Kanban, SLA, API, Webhooks, A/B, Custom Domain | — | — | ✓ | ✓ |
| SSO, Workflows, AI, White-label | — | — | — | ✓ |

**Enforcement**: ALL limits are client-side only (usePlanLimits hook). No server-side enforcement.

## 4. Cross-Dependencies

- **Depends on**: Billing (03) — useSubscription for plan, useUsage for counts
- **Depended on by**: Every feature-gated component across the app
- **Shared files**: `usePlanLimits.ts` (Agent 21 + Agent 25), `FeatureGate.tsx` (Agent 21 + Agent 25)

## 5. i18n Status

- t() coverage: ALL strings wrapped (upgrade.*, billing.*)
- Hebrew translations: COMPLETE
- RTL layout: CORRECT

## 6. Parallelism Eligibility

- Independent: NO — depends on Billing (03), depended on by all gated features
- Conflicts with: usePlanLimits.ts shared between Agent 21 and Agent 25

## 7. Issues Found

### P0 — Critical
- None

### P1 — High
- **All limits client-side only**: No RLS policies enforce form count, submission count, or member count limits. Users can bypass via Supabase client or API. Files: all migration files lack plan-aware RLS
- **Integrations not plan-gated**: IntegrationManager has no FeatureGate wrapping. File: `src/components/integrations/IntegrationManager.tsx`
- **AiFormGenerator not plan-gated**: Missing FeatureGate (should be business). File: `src/components/ai/AiFormGenerator.tsx`

### P2 — Medium
- **Usage percentage edge case**: submissionPercentUsed capped at 100 but could flash >100 before enforcement
- **Stale usage data**: useUsage has 60-second stale time; limit checks may lag behind actual usage
- **No "approaching limit" email**: isNearLimit (80%) only shows UI warning, no email notification

## 8. Recommended Fix Path

1. Add server-side plan limit enforcement via RLS policies or check functions
2. Add FeatureGate to IntegrationManager (requiredPlan TBD — likely "pro" or "growth")
3. Add FeatureGate to AiFormGenerator (requiredPlan="business")
4. Consider adding email notification when approaching limits (via send-email edge function)
