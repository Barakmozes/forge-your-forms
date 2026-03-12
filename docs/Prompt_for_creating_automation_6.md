# Phase 6 — Terminal Commands & Starter Prompts

> Copy-paste ready. Every command for Phase 6 agents.

---

## EXECUTION ORDER

```
Phase 6: Production Hardening & Security

  STEP 1 — Agent 16 (Supabase Audit)
  STEP 2 — Agent 17 (Edge Functions) [after Agent 16]
  STEP 3 — Agent 18 (E2E Testing)    [can partially overlap with 16/17]
  STEP 4 — Agent 19 (DevOps/Infra)   [can partially overlap with 16/17]
  STEP 5 — Agent 20 (Launch Ready)   [AFTER all above complete]
  STEP 6 — Agent 5  (i18n sweep)     [AFTER Agent 20]
  🚀 Deploy v6.0 — PRODUCTION LAUNCH
```

---

## AGENT STARTER COMMANDS

### Agent 16 — Supabase Audit (FIRST RUN)

```
Read the following files in this exact order, then confirm you understand your role:

1. CLAUDE.md
2. .agents/agent-16-supabase-audit/AGENT.md
3. .agents/agent-16-supabase-audit/HANDOFF.md
4. .agents/agent-16-supabase-audit/PROMPTS.md
5. .agents/SYNC-LOG.md

You are Agent 16 — Supabase Audit & Database Hardening. This is Phase 6: Production Hardening.

IMPORTANT WORKING PRINCIPLES:
- Execute Prompt 16.0 first. When fully done and verified, continue to 16.1, then 16.2, then 16.3, then 16.4.
- Do NOT stop between prompts unless context is running low.
- After each prompt: update PROMPTS.md checkboxes, append session entry to PROGRESS.md.
- If context gets long, STOP, write HANDOFF.md with exactly what's done and what's next, and tell me.
- Use Supabase MCP tools (execute_sql) for all database queries.
- Every finding must be documented as PASS / FAIL / WARN with evidence.
- Any FAIL finding requires a remediation plan or migration.

After reading, tell me:
- Your agent number and role
- Your owned files
- Which prompt you will execute first

Start working now. Begin with Prompt 16.0.
```

### Agent 16 — Supabase Audit (CONTINUATION)

```
Read these files in order:
1. CLAUDE.md
2. .agents/agent-16-supabase-audit/AGENT.md
3. .agents/agent-16-supabase-audit/HANDOFF.md
4. .agents/agent-16-supabase-audit/PROMPTS.md
5. .agents/agent-16-supabase-audit/PROGRESS.md
6. .agents/SYNC-LOG.md

You are resuming Agent 16. Check PROGRESS.md and HANDOFF.md to see where you left off. Continue from the next incomplete prompt. Execute all remaining unchecked prompts.
```

---

### Agent 17 — Edge Functions (FIRST RUN)

```
Read the following files in this exact order, then confirm you understand your role:

1. CLAUDE.md
2. .agents/agent-17-edge-security/AGENT.md
3. .agents/agent-17-edge-security/HANDOFF.md
4. .agents/agent-17-edge-security/PROMPTS.md
5. .agents/SYNC-LOG.md

You are Agent 17 — Edge Functions & API Security. Phase 6: Production Hardening.

IMPORTANT WORKING PRINCIPLES:
- Execute Prompt 17.0 first, then continue sequentially through 17.4.
- Do NOT stop between prompts unless context is running low.
- After each prompt: update PROMPTS.md checkboxes, append session entry to PROGRESS.md.
- If context gets long, STOP, write HANDOFF.md and tell me.
- Read Agent 16's AUDIT-REPORT.md for database findings before testing functions.
- Every edge function must be: code reviewed → deployed → smoke tested → documented.
- Security is paramount: validate inputs, handle errors, restrict CORS, rate limit.

After reading, confirm your identity and start with Prompt 17.0.
```

### Agent 17 — Edge Functions (CONTINUATION)

```
Read these files in order:
1. CLAUDE.md
2. .agents/agent-17-edge-security/AGENT.md
3. .agents/agent-17-edge-security/HANDOFF.md
4. .agents/agent-17-edge-security/PROMPTS.md
5. .agents/agent-17-edge-security/PROGRESS.md
6. .agents/SYNC-LOG.md

You are resuming Agent 17. Check PROGRESS.md and HANDOFF.md to see where you left off. Continue from the next incomplete prompt.
```

---

### Agent 18 — E2E Testing (FIRST RUN)

```
Read the following files in this exact order, then confirm you understand your role:

1. CLAUDE.md
2. .agents/agent-18-e2e-testing/AGENT.md
3. .agents/agent-18-e2e-testing/HANDOFF.md
4. .agents/agent-18-e2e-testing/PROMPTS.md
5. .agents/SYNC-LOG.md

You are Agent 18 — E2E Testing & Quality Assurance. Phase 6: Production Hardening.

IMPORTANT WORKING PRINCIPLES:
- Execute Prompt 18.0 first, then continue sequentially through 18.4.
- Do NOT stop between prompts unless context is running low.
- After each prompt: update PROMPTS.md checkboxes, append session entry to PROGRESS.md.
- If context gets long, STOP, write HANDOFF.md and tell me.
- Run npm run test after each prompt to verify all tests pass.
- Tests must be meaningful — not just smoke tests. Test real behavior.
- Mock Supabase client correctly — follow existing patterns in src/test/utils.ts.
- Do NOT install new testing frameworks without asking first.

After reading, confirm your identity and start with Prompt 18.0.
```

### Agent 18 — E2E Testing (CONTINUATION)

```
Read these files in order:
1. CLAUDE.md
2. .agents/agent-18-e2e-testing/AGENT.md
3. .agents/agent-18-e2e-testing/HANDOFF.md
4. .agents/agent-18-e2e-testing/PROMPTS.md
5. .agents/agent-18-e2e-testing/PROGRESS.md
6. .agents/SYNC-LOG.md

You are resuming Agent 18. Check PROGRESS.md and HANDOFF.md to see where you left off. Continue from the next incomplete prompt.
```

---

### Agent 19 — DevOps & Infrastructure (FIRST RUN)

```
Read the following files in this exact order, then confirm you understand your role:

1. CLAUDE.md
2. .agents/agent-19-devops-infra/AGENT.md
3. .agents/agent-19-devops-infra/HANDOFF.md
4. .agents/agent-19-devops-infra/PROMPTS.md
5. .agents/SYNC-LOG.md

You are Agent 19 — DevOps, Monitoring & Infrastructure. Phase 6: Production Hardening.

IMPORTANT WORKING PRINCIPLES:
- Execute Prompt 19.0 first, then continue sequentially through 19.4.
- Do NOT stop between prompts unless context is running low.
- After each prompt: update PROMPTS.md checkboxes, append session entry to PROGRESS.md.
- If context gets long, STOP, write HANDOFF.md and tell me.
- Run npm run lint and npx tsc --noEmit after every code change.
- Do NOT install new dependencies without explicit approval.
- CI/CD YAML must be valid — test locally before committing.
- GDPR features must actually work — test data export and account deletion.

After reading, confirm your identity and start with Prompt 19.0.
```

### Agent 19 — DevOps & Infrastructure (CONTINUATION)

```
Read these files in order:
1. CLAUDE.md
2. .agents/agent-19-devops-infra/AGENT.md
3. .agents/agent-19-devops-infra/HANDOFF.md
4. .agents/agent-19-devops-infra/PROMPTS.md
5. .agents/agent-19-devops-infra/PROGRESS.md
6. .agents/SYNC-LOG.md

You are resuming Agent 19. Check PROGRESS.md and HANDOFF.md to see where you left off. Continue from the next incomplete prompt.
```

---

### Agent 20 — Launch Readiness (FIRST RUN)

```
Read the following files in this exact order, then confirm you understand your role:

1. CLAUDE.md
2. .agents/agent-20-launch-readiness/AGENT.md
3. .agents/agent-20-launch-readiness/HANDOFF.md
4. .agents/agent-20-launch-readiness/PROMPTS.md
5. .agents/SYNC-LOG.md

You are Agent 20 — Production Launch Readiness. Phase 6: Production Hardening.
This is the FINAL agent before launch. All other Phase 6 agents must be COMPLETE.

IMPORTANT WORKING PRINCIPLES:
- VERIFY that Agents 16, 17, 18, 19 are all COMPLETE before proceeding.
  Check: .agents/agent-16-*/PROGRESS.md through agent-19-*/PROGRESS.md
- Execute Prompt 20.0 first, then continue sequentially through 20.4.
- Do NOT stop between prompts unless context is running low.
- After each prompt: update PROMPTS.md checkboxes, append session entry to PROGRESS.md.
- This agent does NOT write production code — it VERIFIES and DOCUMENTS.
- Every check in the launch checklist must have evidence.
- If ANY P0 blocker is found, STOP and report it immediately.

After reading, confirm your identity, verify all dependencies, and start with Prompt 20.0.
```

### Agent 20 — Launch Readiness (CONTINUATION)

```
Read these files in order:
1. CLAUDE.md
2. .agents/agent-20-launch-readiness/AGENT.md
3. .agents/agent-20-launch-readiness/HANDOFF.md
4. .agents/agent-20-launch-readiness/PROMPTS.md
5. .agents/agent-20-launch-readiness/PROGRESS.md
6. .agents/SYNC-LOG.md

You are resuming Agent 20. Check PROGRESS.md and HANDOFF.md to see where you left off. Continue from the next incomplete prompt.
```

---

### Agent 5 — i18n Sweep (Phase 6)

```
Read these files in order:
1. CLAUDE.md
2. .agents/agent-5-i18n/AGENT.md
3. .agents/agent-5-i18n/HANDOFF.md
4. .agents/SYNC-LOG.md

You are Agent 5 — i18n & RTL. Phase 6 is complete (Agents 16-20).
Your task:

1. Scan src/ for hardcoded English strings not wrapped in t().
   Focus on NEW files created by Agents 19-20:
   - src/pages/Privacy.tsx
   - src/pages/DataExport.tsx
   - src/pages/AccountDeletion.tsx
   - src/components/ErrorBoundary.tsx (upgraded text)
   - Any new UI components

2. Add all new keys to en.json under these namespaces:
   privacy.*, gdpr.*, errors.*, launch.*

3. Translate all new keys to he.json with accurate Hebrew.

4. Replace hardcoded strings with t() calls.

5. Fix RTL layout for new components:
   - Privacy page, data export page, error boundary
   - Use Tailwind logical properties (ms-, me-, ps-, pe-)

6. DO NOT modify any existing translated keys.
   Only add NEW keys that don't exist yet.

VERIFY:
- Toggle language to Hebrew — every new screen shows Hebrew
- Toggle back to English — no regressions
- RTL layout correct on all new components
- npm run lint + npx tsc --noEmit pass
```

---

## QUICK WORKFLOW CHEAT SHEET

```
┌─────────────────────────────────────────────────┐
│           PHASE 6 WORK CYCLE                     │
│                                                   │
│  1. cd /path/to/forge-your-forms                 │
│  2. claude --dangerously-skip-permissions         │
│  3. Paste agent starter command                   │
│  4. Watch Claude work...                          │
│  5. When prompt done:                             │
│     → npm run lint && npx tsc --noEmit           │
│     → git add -A && git commit -m "..."          │
│     → Say "Continue to the next prompt."          │
│  6. Repeat step 5 until all prompts done          │
│  7. If context runs low:                          │
│     → Claude writes HANDOFF.md                    │
│     → /exit                                       │
│     → claude --dangerously-skip-permissions       │
│     → Paste continuation command                  │
│  8. When ALL agents done:                         │
│     → Run Agent 5 i18n sweep                      │
│     → npm run build                               │
│     → git push origin main                        │
│     → Execute launch-runbook.md                   │
│     → 🚀 PRODUCTION LAUNCH                       │
└─────────────────────────────────────────────────┘
```