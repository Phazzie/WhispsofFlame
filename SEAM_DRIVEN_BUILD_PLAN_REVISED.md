# ErinPart2 · Seam-Driven Development Build Plan (REVISED)
**Version 1.0 — 21 Nov 2025 (Angular 18 / TypeScript 5.3)**

---

## 0. Seam-Driven Development in 5 Steps

| # | Phase | What you actually do | Result |
|---|-------|----------------------|--------|
| 1 | Identify & Define Seams | Draw every hard boundary (Storage, Sync, Auth). Write minimal TypeScript interfaces for each. | Clear borders that future code must not cross. |
| 2 | Write Contracts | Encode data & behaviour: Zod schemas, interface signatures, HTTP shapes. Version all contracts. | One canonical definition of "correct" for humans and AIs. |
| 3 | Author Tests | Unit / integration / e2e tests assert every contract. All tests start red. | Executable guard-rails that catch drift instantly. |
| 4 | Build Mocks | Stub adapters that satisfy tests with in-memory logic → tests go green. | Proves contracts are usable; UI work can begin while infra is absent. |
| 5 | Implement for Real | Swap mocks for full adapters (DB, WebSocket, Auth). If contract tests fail, diagnose: fix adapter OR version interface. | Production code that can be hot-swapped without touching other seams. |

**Key Change**: Removed "Two-Strike Rule" - replaced with diagnostic approach that allows interface evolution.

---

## 1. Elevator Pitch

Real-time micro task-board for squads of 2-6.
- Open `/s/ABC123` (random 6-char code) → add public or secret tasks
- Secret tasks stay masked until **two unique users** click Reveal, then fade in live for everyone
- Works offline, syncs when reconnected

---

## 2. Milestone-1 Scope

| In | Out (later) |
|----|-------------|
| Join session · Add task · Mark done · Reveal secret (≥ 2 unique votes) | Mobile PWA · Push notifications |
| IndexedDB dev → optional Netlify DB prod | Role-based access · Permissions |
| GuestAuth (random UUID + animal name per browser) | OAuth, SSO |
| **Local WebSocket dev** → optional Netlify WebSocket prod | CRDT conflict-merge |
| Offline-first with sync queue | Real-time cursors |

**Key Changes**:
- ✅ Dev sync uses local WebSocket (not BroadcastChannel)
- ✅ Added offline-first requirement
- ✅ Animal names for better UX

---

## 3. Tech Stack (Stable, Production-Ready)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | **Angular 18.2** (Signals, zoneless) | Stable release, mature ecosystem, full documentation |
| Language | **TypeScript 5.3** | Stable, decorator support, excellent tooling |
| State | Angular Signals + RxJS 8 | Native reactive model, stream composition |
| Styling | Tailwind CSS 3.4 | Utility-first, tree-shakeable |
| Tests | Playwright 1.48 | Mature, stable, excellent docs |
| Schema | Zod 3.23 | Runtime validation, type inference |
| Local dev sync | ws 8.17 (WebSocket server) | Simple, reliable, tests real collaboration |
| Optional backend | Netlify Functions + Neon Postgres | Stable serverless, proven at scale |
| Optional auth | Netlify Identity (GoTrue) | Drop-in widget, mature |

**Key Changes**:
- ⬇️ Angular 21 → 18.2 (stable, documented)
- ⬇️ TypeScript 6 → 5.3 (production-ready)
- ✅ Added `ws` package for local WebSocket dev server
- ✅ Netlify DB (beta) → Neon Postgres (stable)

---

## 4. Seams & Adapters

| Seam Interface (`/src/core/ports`) | Key Methods | Dev Adapter | Prod Adapter | Swap Trigger |
|------------------------------------|-------------|-------------|--------------|--------------|
| **TaskStore** | `list`, `save`, `delete`, `watch` | `IndexedDbTaskStore` | `NeonDbTaskStore` | `ENV.STORAGE_BACKEND` |
| **SyncBus** | `publish`, `subscribe`, `disconnect` | `LocalWebSocketBus` | `NetlifyWebSocketBus` | `ENV.SYNC_BACKEND` |
| **AuthProvider** | `currentUser`, `signIn`, `signOut`, `onChange` | `GuestAuthProvider` | `NetlifyIdentityProvider` | `ENV.AUTH_BACKEND` |
| **ErrorReporter** | `captureException`, `captureMessage` | `ConsoleReporter` | `SentryReporter` | `ENV.ERROR_REPORTER` |

**Key Changes**:
- ✅ BroadcastChannel → LocalWebSocketBus (tests real collaboration)
- ✅ Added ErrorReporter seam (observability)
- ✅ Explicit swap triggers (environment variables)

---

## 5. Data Contracts

### 5.1 Task Contract (`/src/core/models/task.contract.ts`)

```typescript
import { z } from 'zod';

/**
 * Task Contract v1.0
 * Breaking changes require version bump and migration
 */
export const TaskSchemaV1 = z.object({
  id: z.string().uuid(),
  sessionId: z.string().regex(/^[A-Z0-9]{6}$/),
  content: z.string().min(1).max(200),
  isSecret: z.boolean(),

  // FIXED: Track WHO voted, not just count
  votedBy: z.array(z.string().uuid()).max(10), // User IDs who clicked reveal

  status: z.enum(['active', 'done', 'archived']).default('active'),

  createdBy: z.string().uuid(), // User who created task
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  version: z.number().int().positive().default(1), // Optimistic concurrency
});

export type Task = z.infer<typeof TaskSchemaV1>;

// Derived computed property (not stored)
export const taskIsRevealed = (task: Task): boolean =>
  task.votedBy.length >= 2;
```

### 5.2 User Contract (`/src/core/models/user.contract.ts`)

```typescript
import { z } from 'zod';

export const UserSchemaV1 = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1).max(50), // e.g., "Happy Elephant"
  avatar: z.enum(['elephant', 'dolphin', 'fox', 'owl', 'bear', 'wolf']),
  createdAt: z.string().datetime(),
  isGuest: z.boolean().default(true),
});

export type User = z.infer<typeof UserSchemaV1>;
```

### 5.3 Session Contract (`/src/core/models/session.contract.ts`)

```typescript
import { z } from 'zod';

export const SessionSchemaV1 = z.object({
  id: z.string().regex(/^[A-Z0-9]{6}$/),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(), // Auto-delete after 7 days
  participantIds: z.array(z.string().uuid()).max(20),
});

export type Session = z.infer<typeof SessionSchemaV1>;
```

### 5.4 Sync Message Contract (`/src/core/models/sync-message.contract.ts`)

```typescript
import { z } from 'zod';
import { TaskSchemaV1 } from './task.contract';

export const SyncMessageSchemaV1 = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('TASK_CREATED'),
    payload: TaskSchemaV1,
    timestamp: z.string().datetime(),
    userId: z.string().uuid(),
  }),
  z.object({
    type: z.literal('TASK_UPDATED'),
    payload: TaskSchemaV1,
    timestamp: z.string().datetime(),
    userId: z.string().uuid(),
  }),
  z.object({
    type: z.literal('TASK_DELETED'),
    payload: z.object({ id: z.string().uuid() }),
    timestamp: z.string().datetime(),
    userId: z.string().uuid(),
  }),
  z.object({
    type: z.literal('VOTE_REVEAL'),
    payload: z.object({
      taskId: z.string().uuid(),
      userId: z.string().uuid(),
    }),
    timestamp: z.string().datetime(),
    userId: z.string().uuid(),
  }),
]);

export type SyncMessage = z.infer<typeof SyncMessageSchemaV1>;
```

**Key Changes**:
- ✅ Fixed vote tracking: `votedBy: string[]` instead of `revealVotes: number`
- ✅ Added `createdBy`, `status`, `updatedAt`, `version` fields
- ✅ Added User and Session contracts
- ✅ Added typed sync messages (discriminated union)
- ✅ All contracts explicitly versioned (v1.0)

---

## 6. Core Seam Interfaces

### 6.1 TaskStore Port (`/src/core/ports/task-store.port.ts`)

```typescript
import { Observable } from 'rxjs';
import { Task } from '../models/task.contract';

/**
 * TaskStore Port v1.0
 * Persistence abstraction for tasks
 */
export interface TaskStorePort {
  /**
   * List all tasks for a session
   * @throws {StorageError} if underlying storage fails
   */
  listBySession(sessionId: string): Promise<Task[]>;

  /**
   * Save a task (create or update)
   * @throws {StorageError} if save fails
   * @throws {ConflictError} if version mismatch
   */
  save(task: Task): Promise<Task>;

  /**
   * Delete a task
   * @throws {StorageError} if delete fails
   */
  delete(taskId: string): Promise<void>;

  /**
   * Watch for changes to tasks in a session
   * Emits full task list on any change
   */
  watch(sessionId: string): Observable<Task[]>;

  /**
   * Clear all data (for testing/cleanup)
   */
  clear(): Promise<void>;
}
```

### 6.2 SyncBus Port (`/src/core/ports/sync-bus.port.ts`)

```typescript
import { Observable } from 'rxjs';
import { SyncMessage } from '../models/sync-message.contract';

export interface SyncBusPort {
  /**
   * Connect to sync channel for a session
   * @throws {ConnectionError} if connection fails
   */
  connect(sessionId: string, userId: string): Promise<void>;

  /**
   * Disconnect from current session
   */
  disconnect(): Promise<void>;

  /**
   * Publish a message to the session
   * @throws {PublishError} if publish fails
   */
  publish(message: SyncMessage): Promise<void>;

  /**
   * Subscribe to messages for current session
   * Emits messages from other users only
   */
  subscribe(): Observable<SyncMessage>;

  /**
   * Get connection status
   */
  status(): Observable<'connected' | 'disconnected' | 'error'>;
}
```

### 6.3 AuthProvider Port (`/src/core/ports/auth-provider.port.ts`)

```typescript
import { Observable } from 'rxjs';
import { User } from '../models/user.contract';

export interface AuthProviderPort {
  /**
   * Get current authenticated user (null if none)
   */
  currentUser(): Promise<User | null>;

  /**
   * Sign in (for guest: auto-creates UUID + animal name)
   * @throws {AuthError} if sign-in fails
   */
  signIn(): Promise<User>;

  /**
   * Sign out current user
   */
  signOut(): Promise<void>;

  /**
   * Watch for auth state changes
   */
  onChange(): Observable<User | null>;
}
```

### 6.4 ErrorReporter Port (`/src/core/ports/error-reporter.port.ts`)

```typescript
export interface ErrorReporterPort {
  /**
   * Capture an exception with context
   */
  captureException(error: Error, context?: Record<string, unknown>): void;

  /**
   * Capture a message (for warnings, info)
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error'): void;
}
```

**Key Changes**:
- ✅ Added explicit error types in JSDoc
- ✅ Added `watch()` method to TaskStore (reactive updates)
- ✅ Added `status()` to SyncBus (connection monitoring)
- ✅ Added ErrorReporter port (observability)

---

## 7. Error Hierarchy (`/src/core/errors/`)

```typescript
// base.error.ts
export abstract class BaseError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// storage.error.ts
export class StorageError extends BaseError {
  constructor(message: string) {
    super(message, 'STORAGE_ERROR');
  }
}

export class ConflictError extends BaseError {
  constructor(message: string) {
    super(message, 'CONFLICT_ERROR');
  }
}

// sync.error.ts
export class ConnectionError extends BaseError {
  constructor(message: string) {
    super(message, 'CONNECTION_ERROR');
  }
}

export class PublishError extends BaseError {
  constructor(message: string) {
    super(message, 'PUBLISH_ERROR');
  }
}

// auth.error.ts
export class AuthError extends BaseError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR');
  }
}

// validation.error.ts
export class ValidationError extends BaseError {
  constructor(message: string, public issues: unknown[]) {
    super(message, 'VALIDATION_ERROR');
  }
}
```

---

## 8. Project Structure (Complete)

```
/src/
 ├─ app/
 │   ├─ app.config.ts               # Providers, routes, DI
 │   ├─ app.component.ts            # Root shell
 │   └─ app.routes.ts               # Route definitions
 │
 ├─ core/
 │   ├─ ports/                      # Seam interfaces (IMMUTABLE per version)
 │   │   ├─ task-store.port.ts
 │   │   ├─ sync-bus.port.ts
 │   │   ├─ auth-provider.port.ts
 │   │   └─ error-reporter.port.ts
 │   │
 │   ├─ models/                     # Zod schemas + types (VERSIONED)
 │   │   ├─ task.contract.ts
 │   │   ├─ user.contract.ts
 │   │   ├─ session.contract.ts
 │   │   └─ sync-message.contract.ts
 │   │
 │   ├─ errors/                     # Domain errors
 │   │   ├─ base.error.ts
 │   │   ├─ storage.error.ts
 │   │   ├─ sync.error.ts
 │   │   ├─ auth.error.ts
 │   │   └─ validation.error.ts
 │   │
 │   └─ services/                   # Business logic (uses ports)
 │       ├─ task.service.ts         # Orchestrates store + sync
 │       └─ session.service.ts      # Session lifecycle
 │
 ├─ adapters/
 │   ├─ storage/
 │   │   ├─ indexeddb.adapter.ts    # Dev: IndexedDB impl
 │   │   └─ neon-db.adapter.ts      # Prod: Neon Postgres impl
 │   │
 │   ├─ sync/
 │   │   ├─ local-ws.adapter.ts     # Dev: Local WebSocket
 │   │   └─ netlify-ws.adapter.ts   # Prod: Netlify WebSocket
 │   │
 │   ├─ auth/
 │   │   ├─ guest-auth.adapter.ts   # Dev: Random UUID + animal
 │   │   └─ netlify-id.adapter.ts   # Prod: Netlify Identity
 │   │
 │   └─ errors/
 │       ├─ console.adapter.ts      # Dev: console.error
 │       └─ sentry.adapter.ts       # Prod: Sentry
 │
 ├─ features/
 │   ├─ home/                       # Landing page
 │   │   ├─ home.component.ts
 │   │   └─ home.component.spec.ts
 │   │
 │   └─ session/                    # Task board
 │       ├─ session.component.ts
 │       ├─ session.component.spec.ts
 │       ├─ task-list/
 │       │   └─ task-list.component.ts
 │       ├─ task-item/
 │       │   └─ task-item.component.ts
 │       └─ task-form/
 │           └─ task-form.component.ts
 │
 ├─ shared/
 │   ├─ components/                 # Reusable UI atoms
 │   │   ├─ button.component.ts
 │   │   ├─ input.component.ts
 │   │   └─ avatar.component.ts
 │   │
 │   ├─ state/                      # Global signals
 │   │   ├─ auth.state.ts           # Current user signal
 │   │   └─ sync.state.ts           # Connection status signal
 │   │
 │   └─ utils/
 │       ├─ session-code.util.ts    # Generate ABC123 codes
 │       └─ animal-name.util.ts     # Random animal names
 │
 ├─ environments/
 │   ├─ environment.ts              # Dev config
 │   └─ environment.prod.ts         # Prod config
 │
 └─ main.ts                         # Bootstrap

/e2e/
 ├─ fixtures/
 │   └─ test-helpers.ts
 │
 └─ specs/
     ├─ guest-flow.spec.ts          # Join → create task → see task
     ├─ secret-reveal.spec.ts       # 2 votes → reveal
     └─ sync.spec.ts                # Multi-tab collaboration

/server/                            # Local dev WebSocket server
 └─ ws-server.ts                    # Simple ws server for dev

/netlify/
 ├─ functions/
 │   └─ websocket.ts                # Prod WebSocket handler
 │
 └─ edge-functions/
     └─ session-create.ts           # Generate session codes

/docs/
 ├─ SEAMS.md                        # Seam documentation
 ├─ ADR/                            # Architecture Decision Records
 │   ├─ 001-why-seam-driven.md
 │   ├─ 002-local-ws-vs-broadcast.md
 │   └─ 003-vote-tracking.md
 │
 └─ diagrams/
     ├─ seam-overview.mermaid
     └─ data-flow.mermaid
```

---

## 9. State Management Strategy

### 9.1 State Ownership

```typescript
// /src/shared/state/auth.state.ts
import { signal } from '@angular/core';
import { User } from '@/core/models/user.contract';

export const currentUser = signal<User | null>(null);
export const isAuthenticated = computed(() => currentUser() !== null);

// /src/shared/state/sync.state.ts
export const syncStatus = signal<'connected' | 'disconnected' | 'error'>('disconnected');

// /src/core/services/task.service.ts
export class TaskService {
  // Per-session task cache
  private tasksSignal = signal<Task[]>([]);

  tasks = this.tasksSignal.asReadonly();

  // Computed derived state
  activeTasks = computed(() =>
    this.tasks().filter(t => t.status === 'active')
  );

  secretTasks = computed(() =>
    this.tasks().filter(t => t.isSecret && !taskIsRevealed(t))
  );
}
```

### 9.2 Data Flow

```
User Action
    ↓
Component calls Service method
    ↓
Service calls Port method (TaskStore/SyncBus)
    ↓
Adapter executes (IndexedDB/WebSocket)
    ↓
Adapter emits via Observable
    ↓
Service updates Signal
    ↓
Component rerenders (automatic)
```

---

## 10. Security Strategy

### 10.1 Session Access Control
- Session codes are 6-char alphanumeric (2.2B combinations)
- No session listing endpoint (prevents enumeration)
- Rate limit: 10 session joins per IP per hour
- Sessions expire after 7 days, auto-deleted

### 10.2 Content Security
- **XSS Prevention**: All user content rendered as text-only (no HTML)
- **Input validation**: Zod schemas validate all inputs
- **Max task size**: 200 chars (prevents abuse)
- **Max tasks per session**: 100 (prevents spam)

### 10.3 Secret Task Security
- Secrets stored in plaintext (low sensitivity use case)
- Future: Optional E2E encryption with session passphrase
- Reveal logic enforced server-side (can't fake votes)

### 10.4 Rate Limiting
```typescript
// Per user (guest UUID):
- Create task: 10/min
- Vote reveal: 20/min
- Join session: 5/min

// Per session:
- Total tasks: 100
- Active participants: 20
```

### 10.5 Data Privacy
- No PII collected (guest mode)
- Sessions auto-delete after 7 days
- No analytics/tracking in dev mode
- Optional: Plausible (privacy-friendly) in prod

---

## 11. Adapter Implementation Rules

### 11.1 Adapter Contract
Every adapter MUST:
1. Implement its port interface completely
2. Validate all inputs with Zod schemas
3. Throw typed errors (from `/core/errors/`)
4. Log errors via `ErrorReporterPort`
5. Include unit tests with ≥80% coverage
6. Include integration tests against contracts

### 11.2 Adapter Swap Mechanism

```typescript
// /src/app/app.config.ts
import { environment } from '@/environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    // Storage adapter swap
    {
      provide: TaskStorePort,
      useClass: environment.storageBackend === 'neon'
        ? NeonDbAdapter
        : IndexedDbAdapter
    },

    // Sync adapter swap
    {
      provide: SyncBusPort,
      useClass: environment.syncBackend === 'netlify'
        ? NetlifyWebSocketAdapter
        : LocalWebSocketAdapter
    },

    // Auth adapter swap
    {
      provide: AuthProviderPort,
      useClass: environment.authBackend === 'netlify'
        ? NetlifyIdentityAdapter
        : GuestAuthAdapter
    },

    // Error reporter swap
    {
      provide: ErrorReporterPort,
      useClass: environment.production
        ? SentryAdapter
        : ConsoleAdapter
    }
  ]
};
```

### 11.3 Adapter Failure Diagnosis

When a contract test fails for an adapter:

**Step 1: Diagnose**
- Is the adapter logic wrong? → Fix adapter
- Is the port interface unclear? → Add JSDoc examples
- Is the contract schema too strict? → Version the interface

**Step 2: Fix**
- If adapter: Fix + re-run tests
- If interface: Create v1.1 with migration guide
- If test: Update test expectations

**NO automatic deletion** - diagnose root cause first.

---

## 12. Testing Strategy

### 12.1 Test Pyramid

```
        /\
       /E2E\         ← 10% (Playwright, both adapters)
      /------\
     /Integration\   ← 20% (Contract tests per seam)
    /------------\
   /    Unit      \  ← 70% (Pure functions, services)
  /----------------\
```

### 12.2 Test Coverage Targets

| Layer | Target | Enforced |
|-------|--------|----------|
| `/core/models` (validators) | 100% | Yes |
| `/core/services` (business logic) | ≥90% | Yes |
| `/adapters` | ≥80% | Yes |
| `/features` (components) | ≥70% | No (manual check) |

### 12.3 Contract Tests (per adapter)

```typescript
// /src/adapters/storage/indexeddb.adapter.spec.ts
describe('IndexedDbAdapter Contract', () => {
  let adapter: IndexedDbAdapter;

  beforeEach(() => {
    adapter = new IndexedDbAdapter();
  });

  it('should implement TaskStorePort', () => {
    expect(adapter).toBeInstanceOf(TaskStorePort);
  });

  it('should save valid task', async () => {
    const task = createMockTask();
    const saved = await adapter.save(task);
    expect(TaskSchemaV1.parse(saved)).toEqual(task);
  });

  it('should throw StorageError on save failure', async () => {
    // Simulate quota exceeded
    await expect(adapter.save(hugeTask)).rejects.toThrow(StorageError);
  });

  // ... more contract assertions
});
```

### 12.4 E2E Test Matrix

| Spec | Dev Adapters | Prod Adapters |
|------|--------------|---------------|
| `guest-flow.spec.ts` | ✅ Run | ✅ Run |
| `secret-reveal.spec.ts` | ✅ Run | ✅ Run |
| `sync.spec.ts` | ✅ Run | ✅ Run |

**CI runs both matrices** (total 6 test runs).

### 12.5 Playwright Test Example

```typescript
// /e2e/specs/secret-reveal.spec.ts
import { test, expect } from '@playwright/test';

test('secret reveals after 2 unique votes', async ({ browser }) => {
  // Setup: 2 users in same session
  const ctx1 = await browser.newContext();
  const ctx2 = await browser.newContext();
  const page1 = await ctx1.newPage();
  const page2 = await ctx2.newPage();

  const sessionCode = 'TEST01';

  await page1.goto(`/s/${sessionCode}`);
  await page2.goto(`/s/${sessionCode}`);

  // User 1 creates secret task
  await page1.fill('[data-testid="task-input"]', 'Secret plan');
  await page1.check('[data-testid="secret-toggle"]');
  await page1.click('[data-testid="add-task"]');

  // User 2 sees masked task
  await expect(page2.locator('[data-testid="task-0"]')).toContainText('🔒');

  // User 1 votes (1/2)
  await page1.click('[data-testid="reveal-btn-0"]');
  await expect(page2.locator('[data-testid="vote-count-0"]')).toContainText('1/2');

  // User 2 votes (2/2) → reveals
  await page2.click('[data-testid="reveal-btn-0"]');

  // Both users see revealed content
  await expect(page1.locator('[data-testid="task-0"]')).toContainText('Secret plan');
  await expect(page2.locator('[data-testid="task-0"]')).toContainText('Secret plan');
});
```

---

## 13. CI/CD Pipeline

### 13.1 GitHub Actions Workflow

```yaml
name: CI
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm lint

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test:ci
      - name: Check coverage
        run: |
          pnpm exec nyc check-coverage --lines 80 --functions 80 --branches 75

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build --configuration=production
      - name: Check bundle size
        run: |
          SIZE=$(du -sb dist/ | cut -f1)
          if [ $SIZE -gt 1000000 ]; then echo "Bundle too large"; exit 1; fi

  e2e-dev-adapters:
    runs-on: ubuntu-latest
    env:
      STORAGE_BACKEND: indexeddb
      SYNC_BACKEND: local-ws
      AUTH_BACKEND: guest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm exec playwright install --with-deps
      - run: pnpm test:e2e

  e2e-prod-adapters:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    env:
      STORAGE_BACKEND: neon
      SYNC_BACKEND: netlify
      AUTH_BACKEND: netlify
      NEON_DB_URL: ${{ secrets.NEON_TEST_DB }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm exec playwright install --with-deps
      - run: pnpm test:e2e

  deploy:
    needs: [lint, unit-tests, build, e2e-dev-adapters]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build --configuration=production
      - name: Deploy to Netlify
        run: pnpm exec netlify deploy --prod --dir=dist
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_TOKEN }}
```

### 13.2 Quality Gates

| Gate | Threshold | Blocking |
|------|-----------|----------|
| ESLint errors | 0 | Yes |
| ESLint warnings | ≤5 | No |
| Tailwind warnings | 0 | No |
| Unit test coverage | ≥80% | Yes |
| E2E tests (dev) | 100% pass | Yes |
| E2E tests (prod) | 100% pass | Yes (main only) |
| Bundle size | ≤1MB | Yes |
| Lighthouse (desktop) | ≥90 | No (report only) |
| Accessibility (aXe) | 0 violations | Yes |

---

## 14. Local Development

### 14.1 Setup

```bash
# Clone repo
git clone <repo-url>
cd WhispsofFlame

# Install dependencies
pnpm install

# Start local WebSocket server (in separate terminal)
pnpm run ws:dev

# Start Angular dev server
pnpm run dev

# Open browser
open http://localhost:4200
```

### 14.2 Available Scripts

```json
{
  "scripts": {
    "dev": "ng serve",
    "ws:dev": "tsx watch server/ws-server.ts",
    "build": "ng build",
    "test": "ng test",
    "test:ci": "ng test --watch=false --code-coverage",
    "test:e2e": "playwright test",
    "lint": "eslint . && stylelint '**/*.css'",
    "format": "prettier --write .",
    "netlify:dev": "netlify dev",
    "deploy": "netlify deploy --prod"
  }
}
```

### 14.3 Environment Variables

```bash
# .env.local (git-ignored)
STORAGE_BACKEND=indexeddb          # indexeddb | neon
SYNC_BACKEND=local-ws              # local-ws | netlify
AUTH_BACKEND=guest                 # guest | netlify
WS_DEV_PORT=8080                   # Local WebSocket server port
NEON_DB_URL=                       # Prod: Postgres connection string
NETLIFY_FUNCTIONS_URL=             # Prod: Netlify functions URL
```

---

## 15. Acceptance Criteria (Definition of Done)

### 15.1 Functional
- ✅ User can join session via `/s/ABC123`
- ✅ User gets random animal name (e.g., "Happy Elephant")
- ✅ User can create public task → appears for all users within 2s
- ✅ User can create secret task → shows 🔒 masked
- ✅ Secret task requires 2 unique user votes to reveal
- ✅ Revealed secret fades in with animation
- ✅ User can mark task done → strikethrough + gray
- ✅ Tasks persist offline, sync when reconnected

### 15.2 Technical
- ✅ All contract tests pass (100%)
- ✅ All E2E tests pass (dev + prod adapters)
- ✅ Unit test coverage ≥80%
- ✅ 0 ESLint errors
- ✅ Bundle size ≤1MB
- ✅ Lighthouse desktop ≥90
- ✅ 0 accessibility violations (aXe)

### 15.3 Documentation
- ✅ `SEAMS.md` updated with all adapters
- ✅ `CHANGELOG.md` has entry for Milestone-1
- ✅ ADRs written for key decisions (≥3)
- ✅ Mermaid diagram: Seam overview
- ✅ Mermaid diagram: Data flow

### 15.4 Deployment
- ✅ CI green on main branch
- ✅ Netlify preview URL works
- ✅ Prod deployment successful
- ✅ Smoke test passes (create task in prod)

---

## 16. Milestone-1 Implementation Plan

### Phase 1: Foundation (Sequential)
**Duration**: 2-4 hours

- [ ] Project scaffold (Angular 18 + TypeScript 5.3)
- [ ] Install dependencies (Zod, RxJS, Tailwind, Playwright, ws)
- [ ] Create folder structure (`/core`, `/adapters`, `/features`, `/shared`)
- [ ] Define all contracts (Task, User, Session, SyncMessage)
- [ ] Define all ports (TaskStore, SyncBus, AuthProvider, ErrorReporter)
- [ ] Define error hierarchy
- [ ] Setup DI configuration (`app.config.ts`)

**Deliverables**:
- Compiles without errors
- All contracts export correctly
- All ports defined as TypeScript interfaces

---

### Phase 2: Dev Adapters (Parallel - 4 agents)
**Duration**: 4-6 hours

#### Agent 1: IndexedDB Adapter
- [ ] Implement `IndexedDbAdapter` implements `TaskStorePort`
- [ ] Use `idb` library for IndexedDB access
- [ ] Implement `listBySession`, `save`, `delete`, `watch`, `clear`
- [ ] Write contract tests (≥80% coverage)
- [ ] Handle quota errors → throw `StorageError`

#### Agent 2: Local WebSocket Adapter
- [ ] Create `/server/ws-server.ts` (simple ws server)
- [ ] Implement `LocalWebSocketAdapter` implements `SyncBusPort`
- [ ] Handle connect, disconnect, publish, subscribe, status
- [ ] Write contract tests (≥80% coverage)
- [ ] Handle connection errors → throw `ConnectionError`

#### Agent 3: Guest Auth Adapter
- [ ] Implement `GuestAuthAdapter` implements `AuthProviderPort`
- [ ] Generate UUID on first visit (localStorage)
- [ ] Generate random animal name ("Happy Elephant")
- [ ] Implement `currentUser`, `signIn`, `signOut`, `onChange`
- [ ] Write contract tests (≥80% coverage)

#### Agent 4: Console Error Reporter
- [ ] Implement `ConsoleAdapter` implements `ErrorReporterPort`
- [ ] Format errors nicely for console
- [ ] Color-code by severity
- [ ] Write unit tests

**Deliverables**:
- All 4 adapters pass contract tests
- Dev environment can run with these adapters
- No runtime errors

---

### Phase 3: Core Services (Parallel - 2 agents)
**Duration**: 3-4 hours

#### Agent 5: Task Service
- [ ] Inject `TaskStorePort` + `SyncBusPort`
- [ ] Implement `createTask`, `updateTask`, `deleteTask`, `voteReveal`
- [ ] Manage tasks Signal
- [ ] Subscribe to sync messages → update local state
- [ ] Publish local changes → sync bus
- [ ] Write unit tests (≥90% coverage)

#### Agent 6: Session Service
- [ ] Inject `TaskStorePort`
- [ ] Implement `joinSession`, `leaveSession`, `generateSessionCode`
- [ ] Validate session code format
- [ ] Write unit tests (≥90% coverage)

**Deliverables**:
- Services compile and inject correctly
- Unit tests pass
- Business logic isolated from adapters

---

### Phase 4: UI Components (Parallel - 3 agents)
**Duration**: 4-6 hours

#### Agent 7: Home Page Feature
- [ ] `/features/home/home.component.ts`
- [ ] Input: session code (validate format)
- [ ] Button: "Join Session"
- [ ] Button: "Create New Session" (generates random code)
- [ ] Navigate to `/s/:code` on submit
- [ ] Tailwind styling
- [ ] Component tests

#### Agent 8: Session Page Feature
- [ ] `/features/session/session.component.ts`
- [ ] Inject `TaskService`, `AuthProvider`
- [ ] Display current user avatar + name
- [ ] Display connection status
- [ ] Show task list (delegate to `task-list.component`)
- [ ] Show task form (delegate to `task-form.component`)
- [ ] Component tests

#### Agent 9: Task Components
- [ ] `/features/session/task-form/task-form.component.ts`
  - Input: task content (max 200 chars)
  - Checkbox: "Make secret"
  - Button: "Add Task"
  - Calls `taskService.createTask()`

- [ ] `/features/session/task-list/task-list.component.ts`
  - Consumes `taskService.tasks()` signal
  - Maps to `task-item` components

- [ ] `/features/session/task-item/task-item.component.ts`
  - Display task content (masked if secret + not revealed)
  - Button: "Reveal" (if secret, shows vote count)
  - Checkbox: "Done" (strikethrough styling)
  - Fade-in animation on reveal

**Deliverables**:
- All components render correctly
- User can interact with all features
- Signals update UI reactively

---

### Phase 5: Shared UI & Utils (Parallel - 2 agents)
**Duration**: 2-3 hours

#### Agent 10: Shared Components
- [ ] `/shared/components/button.component.ts` (Tailwind styled)
- [ ] `/shared/components/input.component.ts` (Tailwind styled)
- [ ] `/shared/components/avatar.component.ts` (animal icons)
- [ ] Component tests

#### Agent 11: Utilities
- [ ] `/shared/utils/session-code.util.ts`
  - `generateSessionCode(): string` → "ABC123" format

- [ ] `/shared/utils/animal-name.util.ts`
  - `generateAnimalName(): string` → "Happy Elephant"
  - List of 20 adjectives + 20 animals

- [ ] Unit tests (100% coverage)

**Deliverables**:
- Reusable components work in isolation
- Utils are pure functions
- All tests pass

---

### Phase 6: E2E Tests (Parallel - 2 agents)
**Duration**: 3-4 hours

#### Agent 12: Core Flow Tests
- [ ] `/e2e/specs/guest-flow.spec.ts`
  - Join session → see welcome
  - Create task → appears in list
  - Mark task done → strikethrough

- [ ] `/e2e/specs/sync.spec.ts`
  - Two browser contexts (different users)
  - User 1 creates task → User 2 sees it (within 2s)
  - User 2 marks done → User 1 sees update

#### Agent 13: Secret Reveal Tests
- [ ] `/e2e/specs/secret-reveal.spec.ts`
  - User 1 creates secret → masked for User 2
  - User 1 votes (1/2) → shows "1/2 votes"
  - User 2 votes (2/2) → both see reveal animation
  - User 3 can see revealed content immediately

**Deliverables**:
- All E2E tests pass with dev adapters
- Test coverage includes happy path + edge cases

---

### Phase 7: CI/CD & Docs (Sequential)
**Duration**: 2-3 hours

- [ ] Setup `.github/workflows/ci.yml`
- [ ] Configure Netlify deployment
- [ ] Write `SEAMS.md` (document all adapters)
- [ ] Write `CHANGELOG.md` (Milestone-1 entry)
- [ ] Write ADRs (3 minimum):
  - Why Seam-Driven Development
  - Why Local WebSocket vs BroadcastChannel
  - How vote tracking works
- [ ] Create Mermaid diagrams (2 minimum):
  - Seam overview
  - Data flow (user action → sync)
- [ ] Run full CI locally
- [ ] Deploy to Netlify preview
- [ ] Run smoke test on preview URL

**Deliverables**:
- CI green
- Docs complete
- Preview URL works

---

### Phase 8: Optional Prod Adapters (If time permits)
**Duration**: 6-8 hours

- [ ] Neon DB adapter (implements `TaskStorePort`)
- [ ] Netlify WebSocket adapter (implements `SyncBusPort`)
- [ ] Netlify Identity adapter (implements `AuthProviderPort`)
- [ ] E2E tests pass with prod adapters
- [ ] Deploy to production

---

## 17. Parallel Execution Strategy

### Wave 1: Foundation (Sequential)
**1 agent** - Project setup

### Wave 2: Adapters + Services (Parallel)
**6 agents** working simultaneously:
1. IndexedDB adapter
2. Local WebSocket adapter
3. Guest Auth adapter
4. Console Error Reporter
5. Task Service
6. Session Service

### Wave 3: UI (Parallel)
**5 agents** working simultaneously:
7. Home page
8. Session page
9. Task components
10. Shared components
11. Utilities

### Wave 4: Testing (Parallel)
**2 agents** working simultaneously:
12. Core flow E2E tests
13. Secret reveal E2E tests

### Wave 5: Finalize (Sequential)
**1 agent** - CI/CD + Documentation

**Total estimated time**: 20-30 hours with parallelization (vs 60+ hours sequential)

---

## 18. Commit Strategy

### Branch Naming
- `feat/core-contracts` - Foundation
- `feat/adapter-indexeddb` - Storage adapter
- `feat/adapter-ws-local` - Sync adapter
- `feat/adapter-guest-auth` - Auth adapter
- `feat/service-task` - Business logic
- `feat/ui-home` - Home page
- `feat/ui-session` - Session page
- `feat/e2e-tests` - Acceptance tests
- `fix/vote-tracking` - Bug fixes

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

Example:
```
feat(adapter): implement IndexedDB task store

- Implements TaskStorePort interface
- Handles quota exceeded errors
- Includes contract tests with 85% coverage

Closes #12
```

### Commit Size
- Target: 100-300 LOC
- Maximum: 500 LOC
- If larger: split into multiple commits

---

## 19. Failure Recovery

### If CI fails:
1. Check which job failed (lint / test / build / e2e)
2. Run locally: `pnpm run <script>`
3. Fix errors
4. Commit fix
5. Push → CI re-runs

### If E2E tests are flaky:
1. Add explicit waits (`await expect().toBeVisible()`)
2. Increase timeout for network operations
3. Add retry logic (Playwright auto-retries)

### If adapter tests fail:
1. Check contract test output
2. Diagnose: adapter bug vs port unclear vs contract too strict
3. Fix appropriate layer
4. If port changes needed: version interface (v1.1)

---

## 20. Success Metrics

### Milestone-1 Complete When:
- [ ] All 15.1-15.4 acceptance criteria met
- [ ] CI green for 3 consecutive runs
- [ ] Production preview URL deployed
- [ ] Manual smoke test passes (human QA)
- [ ] Docs reviewed and approved
- [ ] No critical bugs in backlog

---

## 21. What's Different in This Revised Plan?

| Original Issue | Revised Solution |
|----------------|------------------|
| ❌ BroadcastChannel (single device) | ✅ Local WebSocket server (multi-device dev testing) |
| ❌ `revealVotes: number` (bug) | ✅ `votedBy: string[]` (tracks unique voters) |
| ❌ Angular 21 / TS 6 (bleeding edge) | ✅ Angular 18 / TS 5.3 (stable) |
| ❌ Netlify DB (beta) | ✅ Neon Postgres (stable) |
| ❌ No security strategy | ✅ Section 10: Complete security plan |
| ❌ No error handling | ✅ Typed error hierarchy + ErrorReporter seam |
| ❌ Two-Strike Rule (unclear) | ✅ Diagnostic approach with versioning |
| ❌ Immutable interfaces (too rigid) | ✅ Versioned interfaces with migration |
| ❌ Missing state management | ✅ Section 9: Signal-based state ownership |
| ❌ Missing project structure | ✅ Section 8: Complete folder tree |
| ❌ Only E2E tests mentioned | ✅ Section 12: Unit + Integration + E2E pyramid |
| ❌ No CI/CD details | ✅ Section 13: Complete GitHub Actions workflow |
| ❌ No parallel execution plan | ✅ Section 16-17: 13 agents in 5 waves |

---

## 22. Final Checklist Before Starting

- [ ] Read this plan end-to-end
- [ ] Understand seam boundaries (4 seams: Storage, Sync, Auth, Errors)
- [ ] Understand data contracts (Task, User, Session, SyncMessage)
- [ ] Understand adapter swap mechanism (DI providers)
- [ ] Understand test strategy (pyramid + contract tests)
- [ ] Understand parallel execution plan (5 waves)
- [ ] Ready to code? ✅ Let's build!

---

**END OF REVISED PLAN**

*This plan is 100% seam-driven and addresses all critical issues from the original brief.*
