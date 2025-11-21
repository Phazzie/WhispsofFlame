# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - Milestone 1 (Seam-Driven Foundation)

#### Core Architecture
- Implemented 4 seam interfaces: TaskStore, SyncBus, AuthProvider, ErrorReporter
- Created versioned data contracts (Task v1, User v1, Session v1, SyncMessage v1)
- Built error hierarchy (StorageError, ConflictError, ConnectionError, etc.)
- Configured environment-based adapter swapping

#### Dev Adapters (197 tests total)
- **IndexedDbAdapter** (28 tests, ~85% coverage)
  - Browser IndexedDB persistence with quota handling
  - Optimistic concurrency control with version checking
  - Observable task streams per session

- **LocalWebSocketAdapter** (23 tests, ~90% coverage)
  - Local WebSocket server for multi-user sync (port 8080)
  - Room-based message routing by sessionId
  - Connection status monitoring

- **GuestAuthAdapter** (28 tests, ~96% coverage)
  - Anonymous authentication with UUID generation
  - Random animal names ("Happy Elephant", "Swift Fox", etc.)
  - LocalStorage persistence

- **ConsoleAdapter** (22 tests, 100% coverage)
  - Pretty console logging with ANSI colors
  - Timestamp formatting and stack trace handling

#### Business Logic Services (96 tests total)
- **TaskService** (46 tests, ~95% coverage)
  - Task CRUD with Signal-based reactivity
  - Secret task reveal voting (≥2 unique votes required)
  - Sync message handling (TASK_CREATED, TASK_UPDATED, TASK_DELETED, VOTE_REVEAL)
  - Computed signals for active/secret task filtering

- **SessionService** (50 tests, ~95% coverage)
  - Session code generation (6-char alphanumeric)
  - Session joining with validation
  - Auto-sign-in for unauthenticated users

#### UI Components (162 tests total)
- **HomeComponent** (23 tests, ~95% coverage)
  - Landing page with session join/create
  - Session code validation
  - Error display and uppercase normalization

- **SessionComponent** (39 tests, ~95% coverage)
  - Task board with user info and connection status
  - Task creation form (public/secret toggle)
  - Real-time sync status indicator

- **TaskItemComponent** (39 tests, ~87% coverage)
  - Task display (public, masked secret, revealed secret)
  - Reveal voting button with vote count
  - Done/delete actions
  - Relative timestamp display

- **Shared Components** (61 tests, ~97% coverage)
  - ButtonComponent (3 variants, 3 sizes)
  - InputComponent (two-way binding, maxLength)
  - AvatarComponent (6 animals, 3 sizes, emoji display)

#### Utilities
- Session code generator/validator (100% coverage)
- Animal name generator with avatar mapping (100% coverage)
- Relative time formatter ("2m ago", "3h ago")

#### E2E Tests
- Guest flow tests (join, create task, mark done)
- Multi-tab sync tests (real-time updates across users)
- Secret reveal tests (voting, duplicate prevention, late-join behavior)

#### Infrastructure
- Angular 18.2 with standalone components
- TypeScript 5.5 (strict mode)
- Tailwind CSS 3.4 for styling
- Playwright 1.48 for E2E testing
- Zod 3.23 for runtime validation
- RxJS 7.8 for reactive streams
- GitHub Actions CI/CD workflow

### Changed
- Migrated from Angular 21 (unstable) to Angular 18.2 (stable)
- Fixed vote tracking bug: `revealVotes: number` → `votedBy: string[]`
- Changed dev sync from BroadcastChannel to LocalWebSocket (enables multi-device testing)

### Security
- XSS prevention (text-only rendering)
- Input validation with Zod schemas
- Rate limiting design (10 tasks/min per user)
- Session code collision prevention (36^6 = 2.2B combinations)

---

## Statistics

- **Total Code**: ~10,000+ lines
- **Total Tests**: 359+ test cases
- **Estimated Coverage**: ~90% overall
- **Build Time**: ~7 seconds (production)
- **Bundle Size**: ~325 KB initial + lazy chunks

---

## Future Roadmap

### Milestone 2 (Production Adapters)
- [ ] NeonDbAdapter for cloud persistence
- [ ] NetlifyWebSocketAdapter for production sync
- [ ] NetlifyIdentityAdapter for OAuth
- [ ] SentryAdapter for error tracking

### Milestone 3 (Features)
- [ ] Mobile PWA support
- [ ] Offline sync queue
- [ ] Push notifications
- [ ] Task templates
- [ ] Session permissions

### Milestone 4 (Scale)
- [ ] CRDT conflict resolution
- [ ] Real-time cursors
- [ ] Session analytics
- [ ] Performance monitoring
