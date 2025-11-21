# Seam-Driven Architecture Documentation

## Overview
This application follows **Seam-Driven Development** principles with strict separation between core business logic and infrastructure adapters.

## The 4 Seams

### 1. Storage Seam (`TaskStorePort`)
**Purpose**: Persistence abstraction for tasks

**Interface**: `/src/core/ports/task-store.port.ts`

**Adapters**:
- **Dev**: `IndexedDbAdapter` → Browser IndexedDB storage
- **Prod** (future): `NeonDbAdapter` → Neon Postgres cloud database

**Methods**:
- `listBySession(sessionId)` - Retrieve all tasks for a session
- `save(task)` - Create or update task (with version check)
- `delete(taskId)` - Remove task
- `watch(sessionId)` - Observable stream of task changes
- `clear()` - Testing utility

**Swap Mechanism**: `environment.storageBackend` ('indexeddb' | 'neon')

---

### 2. Sync Seam (`SyncBusPort`)
**Purpose**: Real-time synchronization across users

**Interface**: `/src/core/ports/sync-bus.port.ts`

**Adapters**:
- **Dev**: `LocalWebSocketAdapter` → Local WebSocket server (port 8080)
- **Prod** (future): `NetlifyWebSocketAdapter` → Netlify Functions WebSocket

**Methods**:
- `connect(sessionId, userId)` - Join session channel
- `disconnect()` - Leave channel
- `publish(message)` - Send sync message
- `subscribe()` - Observable of incoming messages
- `status()` - Observable of connection state

**Message Types**: TASK_CREATED, TASK_UPDATED, TASK_DELETED, VOTE_REVEAL

**Swap Mechanism**: `environment.syncBackend` ('local-ws' | 'netlify')

---

### 3. Auth Seam (`AuthProviderPort`)
**Purpose**: User authentication and identity

**Interface**: `/src/core/ports/auth-provider.port.ts`

**Adapters**:
- **Dev**: `GuestAuthAdapter` → Anonymous guest with animal name
- **Prod** (future): `NetlifyIdentityAdapter` → OAuth via Netlify Identity

**Methods**:
- `currentUser()` - Get authenticated user
- `signIn()` - Authenticate (guest: auto-generate UUID + name)
- `signOut()` - Clear authentication
- `onChange()` - Observable of auth state changes

**Guest Behavior**:
- Generates UUID with `crypto.randomUUID()`
- Assigns random animal name ("Happy Elephant")
- Persists in `localStorage` as `whisps_guest_user`

**Swap Mechanism**: `environment.authBackend` ('guest' | 'netlify')

---

### 4. Error Reporting Seam (`ErrorReporterPort`)
**Purpose**: Observability and error tracking

**Interface**: `/src/core/ports/error-reporter.port.ts`

**Adapters**:
- **Dev**: `ConsoleAdapter` → Pretty console.error() with colors
- **Prod** (future): `SentryAdapter` → Sentry error tracking

**Methods**:
- `captureException(error, context?)` - Log errors with context
- `captureMessage(message, level)` - Log info/warning/error messages

**Swap Mechanism**: `environment.production` (boolean)

---

## Data Flow

```
User Action
    ↓
Component (Signal updates)
    ↓
Service (Business Logic)
    ↓
Port Interface (Seam)
    ↓
Adapter Implementation
    ↓
External System (DB/WebSocket/etc)
```

**Example: Creating a Task**
```
1. User fills form → SessionComponent
2. Component calls → TaskService.createTask()
3. TaskService validates → Zod schema
4. TaskService saves → TaskStorePort.save()
5. IndexedDbAdapter → Browser IndexedDB
6. TaskService publishes → SyncBusPort.publish()
7. LocalWebSocketAdapter → WebSocket broadcast
8. TaskService updates → Signal (UI rerenders)
```

---

## Adapter Swapping

Configured in `/src/app/app.config.ts`:

```typescript
{
  provide: TaskStorePort,
  useClass: environment.storageBackend === 'neon'
    ? NeonDbAdapter
    : IndexedDbAdapter
}
```

**Benefits**:
- No code changes required
- Test both adapters in CI
- Gradual migration (feature flags)
- Easy rollback

---

## Contract Versioning

All contracts are versioned (e.g., `TaskSchemaV1`):

```typescript
export const TaskSchemaV1 = z.object({
  id: z.string().uuid(),
  // ...
  version: z.number().int().positive().default(1),
});
```

**When to bump version**:
- ✅ Adding required fields
- ✅ Changing field types
- ✅ Removing fields
- ❌ Adding optional fields (backwards compatible)

**Migration process**:
1. Create `TaskSchemaV2` with changes
2. Update all adapters to support both versions
3. Run migration script (convert V1 → V2)
4. Remove V1 support

---

## Testing Strategy

### Contract Tests
Every adapter MUST pass contract tests:

```typescript
describe('IndexedDbAdapter Contract', () => {
  it('implements TaskStorePort', () => {
    expect(adapter).toBeInstanceOf(TaskStorePort);
  });

  it('saves valid task', async () => {
    const task = createMockTask();
    const saved = await adapter.save(task);
    expect(TaskSchemaV1.parse(saved)).toEqual(task);
  });

  // ... more contract assertions
});
```

### E2E Tests
Run against **both** dev and prod adapters:

```bash
# Dev adapters
STORAGE_BACKEND=indexeddb SYNC_BACKEND=local-ws pnpm test:e2e

# Prod adapters (future)
STORAGE_BACKEND=neon SYNC_BACKEND=netlify pnpm test:e2e
```

---

## Adding a New Adapter

**Example: Adding Neon Database Adapter**

1. **Create adapter**: `/src/adapters/storage/neon-db.adapter.ts`
2. **Implement interface**: Extend `TaskStorePort`
3. **Validate contracts**: Use Zod schemas for all I/O
4. **Write tests**: Contract tests + integration tests
5. **Register in DI**: Update `/src/app/app.config.ts`
6. **Document**: Add to SEAMS.md

```typescript
export class NeonDbAdapter extends TaskStorePort {
  constructor(
    private readonly errorReporter: ErrorReporterPort,
    private readonly dbUrl: string
  ) {}

  async listBySession(sessionId: string): Promise<Task[]> {
    try {
      const result = await sql`SELECT * FROM tasks WHERE session_id = ${sessionId}`;
      return result.rows.map(row => TaskSchemaV1.parse(row));
    } catch (error) {
      this.errorReporter.captureException(error as Error);
      throw new StorageError('Failed to list tasks');
    }
  }

  // ... implement other methods
}
```

---

## Seam Boundaries

**DO**:
- ✅ Keep interfaces small and focused
- ✅ Validate all data at seam boundaries
- ✅ Log errors via ErrorReporterPort
- ✅ Use observables for reactive data
- ✅ Version all contracts

**DON'T**:
- ❌ Leak implementation details through interface
- ❌ Couple business logic to adapters
- ❌ Skip validation at boundaries
- ❌ Return raw external types
- ❌ Break interfaces without versioning

---

## Current Status

| Seam | Dev Adapter | Prod Adapter | Status |
|------|-------------|--------------|--------|
| Storage | IndexedDbAdapter | NeonDbAdapter | ⚠️  Dev only |
| Sync | LocalWebSocketAdapter | NetlifyWebSocketAdapter | ⚠️  Dev only |
| Auth | GuestAuthAdapter | NetlifyIdentityAdapter | ⚠️  Dev only |
| Errors | ConsoleAdapter | SentryAdapter | ⚠️  Dev only |

**Legend**: ✅ Complete | ⚠️  In Progress | ❌ Not Started

---

## References

- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [Ports and Adapters Pattern](https://herbertograca.com/2017/09/14/ports-adapters-architecture/)
- [Zod Validation](https://zod.dev/)
