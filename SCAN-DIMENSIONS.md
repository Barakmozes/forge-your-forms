# SCAN-DIMENSIONS.md — Dimension Templates for Scanner V3

> The Scanner reads this file for output format templates. Only active dimensions (from PROJECT-PROFILE.md) are used per feature scan.

---

## Section 0 — PROJECT-PROFILE.md Format

```markdown
# Project Profile

**Scanned**: {{DATE}}
**Rules File**: {{PROJECT_RULES_FILE}}
**Project Type**: {{Web Application / CLI Tool / Library-SDK / Mobile App / Backend-API / Service-Worker}}
**Secondary Types**: {{list or "None"}}

## Tech Stack

| Dimension | Value | Confidence |
|-----------|-------|------------|
| Language | {{detected}} | HIGH/MEDIUM/LOW |
| Framework | {{detected}} | HIGH/MEDIUM/LOW |
| Build System | {{detected}} | HIGH/MEDIUM/LOW |
| Package Manager | {{detected}} | HIGH/MEDIUM/LOW |
| Database | {{detected}} | HIGH/MEDIUM/LOW |
| ORM / DB Client | {{detected}} | HIGH/MEDIUM/LOW |
| Auth Provider | {{detected}} | HIGH/MEDIUM/LOW |
| Test Framework | {{detected}} | HIGH/MEDIUM/LOW |
| Linter | {{detected}} | HIGH/MEDIUM/LOW |
| CSS Framework | {{detected}} | HIGH/MEDIUM/LOW |
| Component Library | {{detected}} | HIGH/MEDIUM/LOW |
| AI / LLM Integrations | {{detected}} | HIGH/MEDIUM/LOW |
| Analytics | {{detected}} | HIGH/MEDIUM/LOW |
| Error Monitoring | {{detected}} | HIGH/MEDIUM/LOW |
| Real-time | {{YES/NO — library}} | HIGH/MEDIUM/LOW |
| Caching | {{YES/NO — mechanism}} | HIGH/MEDIUM/LOW |
| i18n | {{YES/NO — library}} | HIGH/MEDIUM/LOW |
| Billing/Payments | {{YES/NO — provider}} | HIGH/MEDIUM/LOW |
| Serverless/Edge | {{YES/NO — platform}} | HIGH/MEDIUM/LOW |
| RBAC/Roles | {{YES/NO — mechanism}} | HIGH/MEDIUM/LOW |
| CI/CD | {{YES/NO — platform}} | HIGH/MEDIUM/LOW |
| Background Jobs | {{YES/NO — mechanism}} | HIGH/MEDIUM/LOW |

## Template Variables

| Variable | Value |
|----------|-------|
(all variables from Step 0.3)

## Active Scan Dimensions

### Mandatory (always)
- [x] Touchpoints Inventory
- [x] E2E Flow Status
- [x] Cross-Dependencies
- [x] Parallelism Eligibility

### Quality (conditional)
- [{{x/ }}] Business Tier Mapping
- [{{x/ }}] i18n / RTL Status
- [{{x/ }}] Auth & RBAC Audit
- [{{x/ }}] Edge Function / Serverless Audit
- [{{x/ }}] Test Coverage Analysis
- [{{x/ }}] Accessibility Audit
- [{{x/ }}] Runtime Performance Audit
- [{{x/ }}] API Security Audit

### Professional (mixed)
- [{{x/ }}] Responsive Design Audit
- [{{x/ }}] Database & Query Optimization
- [x] Code Architecture & Quality (always)
- [x] Error Handling & Resilience (always)
- [{{x/ }}] CI/CD & DevOps Audit
- [x] Documentation Audit (always)
- [{{x/ }}] SEO Audit

### Project-Type Specific
- [{{x/ }}] CLI UX Audit (CLI Tool type)
- [{{x/ }}] Library / SDK API Audit (Library type)
- [{{x/ }}] Mobile App Audit (Mobile type)

### Strategic (always)
- [x] Product Growth & Innovation
```

---

## Section 1 — Mandatory Dimensions

### Dim 1: Touchpoints Inventory

```markdown
### Touchpoints

#### Pages
| File | Purpose |
|------|---------|

#### Components
| File | Purpose |
|------|---------|

#### Hooks / Services
| File | Purpose |
|------|---------|

#### Database Tables
| Table | Key Columns | RLS |
|-------|-------------|-----|

#### API Routes / Edge Functions
| Endpoint / Function | Method | Purpose |
|---------------------|--------|---------|

#### Utilities / Libraries
| File | Purpose |
|------|---------|

#### Config / Schema Files
| File | Purpose |
|------|---------|
```

### Dim 2: E2E Flow Status

For each user journey:
```markdown
### E2E Flows

#### Flow: {{flow_name}}
- **Steps**: {{numbered list}}
- **Verdict**: WORKS | PARTIAL | BROKEN | UNTESTED
- **Evidence**: {{code observation}}
- **Gaps**: {{missing/broken elements}}
```

Verdicts: WORKS = complete path, PARTIAL = main works but edge cases missing, BROKEN = errors/missing imports/logic bugs, UNTESTED = no tests and unverifiable from code alone.

### Dim 3: Cross-Dependencies

```markdown
### Dependencies

#### Depends On
| Feature | Reason | Strength |
|---------|--------|----------|
| {{feature}} | {{why}} | HARD / SOFT |

#### Depended On By
| Feature | Reason | Strength |
|---------|--------|----------|
```

HARD = cannot function without. SOFT = enhanced by but works without.

### Dim 4: Parallelism Eligibility

```markdown
### Parallelism Assessment
- **Exclusive file domain?** YES/NO
- **Shared files**: {{list or "None"}}
- **Can run parallel with**: {{features}}
- **Must run sequential with**: {{features + reason}}
- **Recommended batch**: Infrastructure(1) | Feature(2-3) | Cross-cutting(4+)
```

---

## Section 2 — Quality Dimensions (Conditional)

### Dim: Business Tier Mapping
(If billing/payments detected)
```markdown
### Business Tier Mapping
| Capability | Free | Pro | Enterprise |
|-----------|------|-----|------------|
| {{capability}} | {{access/limit}} | {{access/limit}} | {{access/limit}} |

#### Enforcement Points
| Capability | Enforced? | Location |
|------------|-----------|----------|
```

### Dim: i18n / RTL Status
(If i18n detected)
```markdown
### i18n Status
| Component/Page | Translation Coverage | RTL |
|---------------|---------------------|-----|

#### Hardcoded Strings
| File | Line | String |
|------|------|--------|
```

### Dim: Auth & RBAC Audit
(If role system detected)
```markdown
### Auth & RBAC
| Action | Required Role | Enforced? | Location |
|--------|--------------|-----------|----------|

#### Missing Protections
| Route/Action | Expected | Current |
|-------------|----------|---------|
```

### Dim: Edge Function / Serverless Audit
(If serverless detected)
```markdown
### Serverless Functions
| Function | Trigger | Auth | Error Handling | Cold Start Risk | Status |
|----------|---------|------|----------------|----------------|--------|
```

### Dim: Test Coverage Analysis
(If test framework detected)
```markdown
### Test Coverage
| Module | Unit | Integration | E2E |
|--------|------|------------|-----|

#### Critical Untested Paths
| Path | Risk | Reason |
|------|------|--------|

#### E2E Coverage Gate
- **Total E2E tests**: {{count or ZERO}}
- **Critical user flows covered by E2E**: {{list or "NONE"}}
- **Critical user flows NOT covered**: {{list}}

> **Auto-flag rule**: If the project has user-facing routes/pages AND zero E2E tests exist, automatically create issue: P1 RESILIENCE "No end-to-end test coverage for critical user flows — core user journeys ({{list top 3 flows}}) have no automated verification." Confidence: HIGH.
```

### Dim: Accessibility Audit
(If frontend detected)
```markdown
### Accessibility
| Component | Keyboard Nav | ARIA Labels | Color Contrast | Screen Reader | Focus Mgmt |
|-----------|-------------|-------------|----------------|---------------|------------|
```

### Dim: Runtime Performance Audit
(If frontend+bundler OR API routes detected)

This is the **V3 enhanced** performance dimension covering both frontend and backend:

```markdown
### Runtime Performance

#### Frontend Bundle
| Metric | Value | Status |
|--------|-------|--------|
| Total bundle size | {{size}} | {{OK/LARGE}} |
| Largest chunks | {{list}} | {{tree-shakeable?}} |
| Code splitting | {{YES/NO}} | |
| Lazy loading routes | {{YES/NO}} | |
| Dynamic imports | {{count}} | |

#### Frontend Runtime
| Issue | Location | Impact |
|-------|----------|--------|
| Unnecessary re-renders | {{file:line — evidence}} | HIGH/MEDIUM/LOW |
| Missing React.memo / useMemo / useCallback | {{file:line}} | HIGH/MEDIUM/LOW |
| Large list without virtualization | {{file:line}} | HIGH/MEDIUM/LOW |
| Memory leak pattern (unclean effects) | {{file:line}} | HIGH/MEDIUM/LOW |
| Blocking main thread operations | {{file:line}} | HIGH/MEDIUM/LOW |

#### Backend / API Performance
| Issue | Location | Impact |
|-------|----------|--------|
| N+1 query pattern | {{file:line — query evidence}} | HIGH/MEDIUM/LOW |
| Missing database index (query on unindexed col) | {{table.column}} | HIGH/MEDIUM/LOW |
| No connection pooling | {{file:line}} | HIGH/MEDIUM/LOW |
| Unbounded query (no LIMIT/pagination) | {{file:line}} | HIGH/MEDIUM/LOW |
| Synchronous blocking in async context | {{file:line}} | HIGH/MEDIUM/LOW |
| Missing caching for expensive computation | {{file:line}} | MEDIUM/LOW |

#### Asset Optimization
| Asset Type | Issue | Location |
|-----------|-------|----------|
| Images | {{no compression / no srcset / no lazy load / no WebP}} | {{files}} |
| Fonts | {{no subsetting / no preload / no font-display}} | {{config}} |
| CSS | {{unused CSS / no purging / render-blocking}} | {{files}} |

#### Core Web Vitals Signals
| Signal | Risk | Evidence |
|--------|------|----------|
| LCP risk | {{description}} | {{file:line}} |
| CLS risk | {{description}} | {{file:line}} |
| INP risk | {{description}} | {{file:line}} |
```

### Dim: API Security Audit
(If API routes detected)
```markdown
### API Security
| Endpoint | Auth | Input Validation | Rate Limiting | CORS | Headers |
|----------|------|-----------------|---------------|------|---------|
```

---

## Section 3 — Professional Dimensions

### Dim: Responsive Design Audit
(If frontend/CSS framework detected)

**V3 Enhanced** — includes modern CSS features:

```markdown
### Responsive Design

#### 1. Breakpoint Consistency
| Source | Type | Value | File |
|--------|------|-------|------|
- **Single source of truth?** YES — location / NO — scattered
- **Files with hardcoded breakpoints**: {{list}}

#### 2. Approach Detection
- **Primary**: mobile-first (min-width) / desktop-first (max-width) / mixed
- **Files mixing approaches**: {{list or "None"}}

#### 3. Modern CSS Features
| Feature | Used? | Where |
|---------|-------|-------|
| Container queries (@container) | YES/NO | {{files}} |
| Modern viewport units (dvh/svh/lvh) | YES/NO | {{files using legacy vh}} |
| aspect-ratio property | YES/NO | |
| Logical properties (inline-size, block-size) | YES/NO | |
| CSS-in-JS responsive patterns | YES/NO/N-A | {{library + approach}} |
| prefers-reduced-motion | YES/NO | |
| prefers-color-scheme | YES/NO | |
| Print media queries | YES/NO | |

#### 4. Component Responsiveness
| Component | Responsive Styles? | Fixed Widths? | Images Responsive? |
|-----------|-------------------|---------------|-------------------|

#### 5. Layout Issues
| Issue | Type | File | Line | Risk |
|-------|------|------|------|------|
Types: overflow, no-wrap, fixed-font, small-touch-target (<44px), missing-clamp

#### 6. Navigation & Interactive
- **Mobile menu?** YES / NO — FLAGGED
- **Mobile-friendly modals/dropdowns?** YES/PARTIAL/NO
- **Forms stack on mobile?** YES/NO

#### 7. Responsive Testing
- **Viewport-based tests?** YES — count / NO — ZERO
```

Classification: P0 = pages with NO responsive styles. P1 = partial responsiveness. P2 = inconsistencies.

### Dim: Database & Query Optimization
(If ORM/DB detected)
```markdown
### Database & Query Optimization

#### Schema Health
| Table | Indexes | FKs | Missing Index? | Notes |
|-------|---------|-----|----------------|-------|

#### Query Patterns
| Location | Pattern | Issue | Severity |
|----------|---------|-------|----------|
Patterns: N+1, full-table-scan, missing-index, no-pagination, select-star, no-connection-pool

#### Data Integrity
| Check | Status | Details |
|-------|--------|---------|
RLS policies, cascading deletes, nullable columns, unique constraints, FK constraints

#### Migration Safety
| Risk | Details |
|------|---------|
Risks: destructive migration, data loss, lock-heavy operation
```

### Dim: Code Architecture & Quality (ALWAYS active)
```markdown
### Code Architecture

#### Design Patterns
- **Primary pattern**: {{MVC / Component / Service / etc.}}
- **Consistency**: CONSISTENT / MIXED
- **State management**: {{approach + issues}}

#### Code Smells
| Smell | Location | Severity | Description |
|-------|----------|----------|-------------|
Types: god-component, prop-drilling, circular-dep, dead-code, magic-values, duplication, deep-nesting

#### DRY Violations
| Pattern | Occurrences | Files | Extraction Target |
|---------|-------------|-------|-------------------|

#### Separation of Concerns
| Violation | File | Description |
|-----------|------|-------------|
Types: business-logic-in-UI, DB-in-components, mixed-responsibilities

#### Dependency Health
| Package | Status | Issue |
|---------|--------|-------|
Statuses: OUTDATED, DEPRECATED, VULNERABLE, OK
```

### Dim: Error Handling & Resilience (ALWAYS active)
```markdown
### Error Handling & Resilience

#### Error Boundaries (Frontend)
| Route/Page | Error Boundary? | Fallback UI? |
|-----------|----------------|--------------|

#### Try-Catch Coverage
| Critical Path | Try-Catch? | User Feedback? | Logging? |
|--------------|-----------|----------------|----------|

#### Graceful Degradation
| Feature | Offline Behavior | API Failure | Timeout Handling |
|---------|-----------------|-------------|-----------------|

#### Unhandled Scenarios
| Scenario | Location | Current | Expected |
|----------|----------|---------|----------|
Scenarios: network failure, auth expiry, invalid data, concurrent edit, rate limit

#### Monitoring
- **Structured logging?** YES — library / NO
- **Error tracking?** YES — service / NO
- **Uncaught exception handler?** YES / NO
```

### Dim: CI/CD & DevOps Audit
(If CI/CD or Docker detected)
```markdown
### CI/CD & DevOps

#### Pipeline Health
| Pipeline | Stages | Issues |
|----------|--------|--------|

#### Environment Management
| Check | Status | Details |
|-------|--------|---------|
Checks: .env.example, secrets in source, env-specific configs, prod/dev diff

#### Container Health (if Docker)
| Check | Status | Details |
|-------|--------|---------|
Checks: multi-stage build, .dockerignore, non-root, image size, health check

#### Deployment
- **Strategy**: manual / CI-auto / preview-deploys / blue-green / rolling / unknown
- **Rollback**: YES — details / NO
- **DB migration in deploy**: automated / manual / NO
```

### Dim: Documentation Audit (ALWAYS active)
```markdown
### Documentation

#### README Quality
| Section | Present? | Quality |
|---------|----------|---------|
Sections: description, setup, env vars, architecture, API docs, contributing

#### Code Documentation
| Module | Comments | JSDoc/Docstrings | Type Annotations |
|--------|---------|------------------|-----------------|

#### Missing Docs
| What | Where Needed | Impact |
|------|-------------|--------|
```

### Dim: SEO Audit
(If web app with public routes detected)
```markdown
### SEO

#### Page-Level
| Route | Title | Meta Desc | OG Tags | Canonical | Structured Data |
|-------|-------|-----------|---------|-----------|----------------|

#### Technical
| Check | Status | Details |
|-------|--------|---------|
Checks: sitemap, robots.txt, semantic h1-h6, image alts, 404 page, URL structure, Core Web Vitals
```

### Dim: CLI UX Audit
(If CLI Tool project type detected — `bin` field, `commander`/`yargs`/`clap`/`cobra`)

```markdown
### CLI UX

#### Command Structure
| Command | Flags | Help Text? | Consistent? |
|---------|-------|-----------|-------------|
| {{command}} | {{flags}} | YES/NO | {{matches other commands?}} |

#### Error Messages
| Error Scenario | Message Quality | Exit Code |
|---------------|----------------|-----------|
| {{scenario}} | HELPFUL / VAGUE / MISSING | {{code or NONE}} |
Quality: HELPFUL = explains what went wrong + how to fix. VAGUE = error but no guidance. MISSING = silent failure.

#### CLI Standards Compliance
| Check | Status | Details |
|-------|--------|---------|
| --help on all commands | YES/NO | |
| --version flag | YES/NO | |
| Consistent flag naming (--kebab-case) | YES/NO | {{violations}} |
| Exit codes (0=success, 1=error, 2=usage) | YES/NO | |
| Stdin/stdout piping support | YES/NO/N-A | |
| Color output respects NO_COLOR env | YES/NO | |
| Progress indicators for long operations | YES/NO | |
| Config file support (~/.{{tool}}rc) | YES/NO | |

#### Missing CLI Features
| Feature | Impact |
|---------|--------|
| {{tab completion / man page / --json output / --quiet/--verbose / interactive mode}} | HIGH/MEDIUM/LOW |
```

### Dim: Library / SDK API Audit
(If Library/SDK project type detected — `exports`/`main` without `start`, `lib.rs`, setup.py with no web framework)

```markdown
### Library API

#### Public API Surface
| Export | Type | Documented? | Type-safe? |
|--------|------|-----------|-----------|
| {{name}} | {{function/class/type/constant}} | YES/NO | YES/PARTIAL/NO |

#### API Design Quality
| Check | Status | Details |
|-------|--------|---------|
| Consistent naming conventions | YES/NO | {{violations}} |
| Error types well-defined (not generic Error) | YES/NO | |
| Input validation on public functions | YES/NO | |
| Sensible defaults (minimize required params) | YES/NO | |
| Tree-shakeable (ESM exports) | YES/NO/N-A | |
| Zero/minimal runtime dependencies | {{count deps}} | {{heavy deps?}} |

#### Versioning & Compatibility
| Check | Status | Details |
|-------|--------|---------|
| Semver compliance | YES/NO | |
| CHANGELOG maintained | YES/NO | |
| Breaking changes documented | YES/NO/N-A | |
| Type definitions exported (.d.ts / py.typed) | YES/NO | |
| Minimum supported runtime version declared | YES/NO | |

#### Developer Experience
| Check | Status | Details |
|-------|--------|---------|
| README with quick-start example | YES/NO | |
| API reference docs | YES/NO | |
| Migration guide between versions | YES/NO | |
| Example project / cookbook | YES/NO | |
| Playground / REPL | YES/NO | |
```

### Dim: Mobile App Audit
(If Mobile App project type detected — React Native, Flutter, Capacitor, Expo, Ionic)

```markdown
### Mobile App

#### Platform Coverage
| Feature | iOS | Android | Parity? |
|---------|-----|---------|---------|
| {{feature}} | WORKS/PARTIAL/MISSING | WORKS/PARTIAL/MISSING | YES/NO |

#### Mobile-Specific Concerns
| Check | Status | Details |
|-------|--------|---------|
| Deep linking configured | YES/NO | |
| Offline-first / data caching | YES/NO | {{mechanism}} |
| App size reasonable | {{size or UNKNOWN}} | |
| Push notifications | YES/NO | {{service}} |
| Biometric auth (FaceID/fingerprint) | YES/NO | |
| Splash screen / app icon configured | YES/NO | |
| Status bar handling | YES/NO | |
| Safe area / notch handling | YES/NO | |
| Keyboard avoidance on forms | YES/NO | |
| Back button / gesture navigation | YES/NO | |

#### Performance (Mobile-Specific)
| Check | Status | Details |
|-------|--------|---------|
| Startup time (JS bundle size if RN) | {{fast/slow/unknown}} | |
| List virtualization (FlatList/RecyclerView) | YES/NO | |
| Image caching | YES/NO | {{library}} |
| Memory leak patterns | {{found / none detected}} | |
| Background task handling | YES/NO | |

#### Store Readiness
| Check | Status | Details |
|-------|--------|---------|
| Privacy policy URL | YES/NO | |
| App store screenshots | YES/NO | |
| Permissions justified (camera, location, etc.) | YES/NO | {{unused permissions?}} |
```

---

## Section 4 — Strategic Dimension (ALWAYS active)

### Dim: Product Growth & Innovation

Analyze through 7 lenses. For each opportunity found:

| Field | Description |
|-------|------------|
| What | One-line description |
| Why | Business justification |
| Effort | S (<2h) / M (2–8h) / L (>8h) |
| Impact | Low / Medium / High |
| Confidence | HIGH / MEDIUM / LOW |
| Lens | Which of the 7 lenses found it |
| Dependencies | Existing infrastructure it builds on |

#### Lens 1: Missing Features (Quick Wins)
Pattern-match: list+no search → "add search", data+no export → "add export", forms+no autosave → "add autosave", content+no share → "add sharing", repetitive+no bulk → "add bulk actions", data+no dashboard → "add dashboard".

#### Lens 2: AI Integration Opportunities
Scan for: text inputs → AI autocomplete/rewrite, data tables → smart sorting/anomaly detection, search → semantic search, forms → AI pre-fill, reports → AI summaries, onboarding → AI-guided setup, support → AI chatbot, content → AI generation.

#### Lens 3: Business Model Enhancers
Tier differentiation, usage-based pricing, viral/referral mechanics, stickiness features, upsell triggers.

#### Lens 4: UX Gaps (Not bugs — missing polish)
Loading states/skeletons, empty states with CTAs, success/error feedback, keyboard shortcuts, dark/light toggle, onboarding flow, undo/redo for destructive actions.

#### Lens 5: Integration Opportunities
SaaS → Zapier/webhooks/API, e-commerce → payments/shipping, CRM → email/calendar/social, content → social sharing/SEO/RSS, any → notifications/Slack/analytics.

#### Lens 6: Monetization & Conversion
Free-to-paid friction, churn risk features, premium analytics from existing data, feature gates.

#### Lens 7: Technical Leverage (80% built, needs 20%)
Supabase → real-time features, auth → team/org features, file handling → version history, API → public docs/developer portal.

Output format:
```markdown
### Product Growth & Innovation

| # | Opportunity | Lens | Effort | Impact | Confidence | Dependencies |
|---|-----------|------|--------|--------|------------|-------------|
```

Classification: P0 = High Impact + Low Effort + HIGH Confidence. P1 = High Impact + Medium/High Effort. P2 = Nice to have.

---

# End of SCAN-DIMENSIONS.md
