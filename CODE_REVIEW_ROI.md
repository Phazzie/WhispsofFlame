# Code Review: Problems Ranked by ROI

## ROI Formula
**ROI Score = (Impact × Urgency) / Effort**
- Impact: 1-10 (how much it affects the app)
- Urgency: 1-5 (how critical is it now)
- Effort: Minutes to fix

---

## Problems Grouped by Category & Ranked by ROI

| Group | Issue | Impact | Urgency | Effort (min) | ROI Score | Status |
|-------|-------|--------|---------|--------------|-----------|--------|
| **🔴 CRITICAL PATH (App Won't Run)** | | | | | **46.7** | |
| Browser | #1: Node.js WebSocket in browser | 10 | 5 | 150 | 0.33 | 🔴 BLOCKING |
| Runtime | #3: Double version increment bug | 8 | 4 | 10 | 3.20 | 🔴 BLOCKING |
| **🟡 HIGH PRIORITY (Tests & Quality)** | | | | | **21.3** | |
| Import | #2: Missing test helper exports | 7 | 4 | 40 | 0.70 | 🟡 HIGH |
| Config | #4: Missing ESLint configuration | 5 | 3 | 15 | 1.00 | 🟡 MEDIUM |
| **🟢 LOW PRIORITY (Polish & Edge Cases)** | | | | | **5.8** | |
| TypeScript | #5: Strict index signature warnings | 2 | 2 | 5 | 0.80 | 🟢 LOW |
| Runtime | #8: No conflict error recovery | 4 | 2 | 20 | 0.40 | 🟢 LOW |
| Runtime | #9: No sign-in failure handling | 3 | 2 | 5 | 1.20 | 🟢 LOW |
| Runtime | #7: Memory leak in session subjects | 3 | 1 | 30 | 0.10 | 🟢 LOW |
| TypeScript | #6: Test mock signature mismatch | 2 | 1 | 10 | 0.20 | 🟢 LOW |

---

## Grouped by Related Work

### GROUP A: Browser Runtime (ROI: 0.33)
**Dependencies**: None
**Blocks**: Everything - app won't load in browser
**Team Size**: 1 agent (complex fix)

| Issue | Fix |
|-------|-----|
| #1: WebSocket | Replace `ws` package with native browser WebSocket API |

**Impact**: Unblocks entire application
**Effort**: 150 minutes
**Why High ROI**: Fixes the #1 blocker preventing app from running

---

### GROUP B: Data Integrity (ROI: 3.20)
**Dependencies**: None
**Blocks**: Task updates
**Team Size**: 1 agent (simple fix)

| Issue | Fix |
|-------|-----|
| #3: Version increment | Remove duplicate version++ in TaskService |

**Impact**: Fixes optimistic concurrency control
**Effort**: 10 minutes
**Why High ROI**: Critical bug, trivial fix

---

### GROUP C: Testing Infrastructure (ROI: 0.85)
**Dependencies**: #1 (WebSocket) must be fixed first
**Blocks**: E2E tests
**Team Size**: 2 agents (can parallelize)

| Issue | Fix |
|-------|-----|
| #2: Test helpers | Add 4 missing export functions |
| #6: Mock signatures | Add type assertions in test file |

**Impact**: Enables E2E test execution
**Effort**: 50 minutes total
**Why Medium ROI**: Tests can't run without these

---

### GROUP D: Code Quality (ROI: 1.00)
**Dependencies**: None
**Blocks**: Linting, CI checks
**Team Size**: 1 agent

| Issue | Fix |
|-------|-----|
| #4: ESLint config | Create .eslintrc.json + install plugins |
| #5: TS warnings | Use bracket notation for process.env |

**Impact**: CI pipeline works
**Effort**: 20 minutes
**Why Medium ROI**: Quick win for CI

---

### GROUP E: Error Resilience (ROI: 0.57)
**Dependencies**: #3 should be fixed first
**Blocks**: Nothing critical
**Team Size**: 1 agent

| Issue | Fix |
|-------|-----|
| #8: Conflict recovery | Reload tasks on version conflict |
| #9: Sign-in failure | Add error handling in SessionComponent |

**Impact**: Better error handling
**Effort**: 25 minutes
**Why Low ROI**: Edge cases, can defer

---

### GROUP F: Memory Management (ROI: 0.10)
**Dependencies**: None
**Blocks**: Nothing
**Team Size**: 1 agent (or defer)

| Issue | Fix |
|-------|-----|
| #7: Subject cleanup | Add finalize() or manual cleanup for BehaviorSubjects |

**Impact**: Prevents memory leak over time
**Effort**: 30 minutes
**Why Low ROI**: Only matters with heavy usage

---

## Recommended Fix Order

### Phase 1: CRITICAL (Parallel - 2 agents)
1. **Agent 1**: Fix #1 (WebSocket) - 150 min
2. **Agent 2**: Fix #3 (Version) + #4 (ESLint) + #5 (TS) - 30 min

**Total Time**: 150 minutes (parallel)
**Impact**: App runs in browser, data integrity fixed

### Phase 2: HIGH PRIORITY (Parallel - 2 agents)
3. **Agent 3**: Fix #2 (Test helpers) - 40 min
4. **Agent 4**: Fix #6 (Mock types) - 10 min

**Total Time**: 40 minutes (parallel)
**Impact**: E2E tests work

### Phase 3: POLISH (Sequential or defer)
5. **Agent 5**: Fix #8 + #9 (Error handling) - 25 min
6. **Agent 6**: Fix #7 (Memory) - 30 min (optional)

**Total Time**: 55 minutes
**Impact**: Production-ready edge case handling

---

## Summary

**Critical Fixes**: 2 issues (160 min work, 150 min wall time with 2 agents)
**High Priority**: 2 issues (50 min work, 40 min wall time with 2 agents)
**Polish**: 3 issues (55 min work)

**Total Effort**: 265 minutes (~4.5 hours)
**With 4 Parallel Agents**: ~190 minutes (~3 hours)
**Without Parallelization**: 265 minutes (~4.5 hours)

**Time Saved**: 75 minutes (28% faster)