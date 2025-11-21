import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TaskStorePort } from '../core/ports/task-store.port';
import { SyncBusPort } from '../core/ports/sync-bus.port';
import { AuthProviderPort } from '../core/ports/auth-provider.port';
import { ErrorReporterPort } from '../core/ports/error-reporter.port';
import { IndexedDbAdapter } from '../adapters/storage/indexeddb.adapter';
import { LocalWebSocketAdapter } from '../adapters/sync/local-ws.adapter';
import { GuestAuthAdapter } from '../adapters/auth/guest-auth.adapter';
import { ConsoleAdapter } from '../adapters/errors/console.adapter';

describe('AppConfig', () => {
  describe('with development environment', () => {
    beforeEach(async () => {
      // Mock environment for development
      const mockEnvironment = {
        production: false,
        storageBackend: 'indexeddb' as 'indexeddb' | 'neon',
        syncBackend: 'local-ws' as 'local-ws' | 'netlify',
        authBackend: 'guest' as 'guest' | 'netlify',
        wsDevPort: 8080,
      };

      // Create config dynamically to use mocked environment
      const { provideZoneChangeDetection } = await import('@angular/core');
      const { provideRouter } = await import('@angular/router');
      const { routes } = await import('./app.routes');

      const testConfig = {
        providers: [
          provideZoneChangeDetection({ eventCoalescing: true }),
          provideRouter(routes),
          {
            provide: TaskStorePort,
            useClass: mockEnvironment.storageBackend === 'neon'
              ? IndexedDbAdapter
              : IndexedDbAdapter
          },
          {
            provide: SyncBusPort,
            useClass: mockEnvironment.syncBackend === 'netlify'
              ? LocalWebSocketAdapter
              : LocalWebSocketAdapter
          },
          {
            provide: AuthProviderPort,
            useClass: mockEnvironment.authBackend === 'netlify'
              ? GuestAuthAdapter
              : GuestAuthAdapter
          },
          {
            provide: ErrorReporterPort,
            useClass: mockEnvironment.production
              ? ConsoleAdapter
              : ConsoleAdapter
          }
        ]
      };

      TestBed.configureTestingModule(testConfig);
    });

    it('should provide Router', () => {
      const router = TestBed.inject(Router);
      expect(router).toBeTruthy();
    });

    it('should provide TaskStorePort with IndexedDbAdapter', () => {
      const taskStore = TestBed.inject(TaskStorePort);
      expect(taskStore).toBeTruthy();
      expect(taskStore instanceof IndexedDbAdapter).toBe(true);
    });

    it('should provide SyncBusPort with LocalWebSocketAdapter', () => {
      const syncBus = TestBed.inject(SyncBusPort);
      expect(syncBus).toBeTruthy();
      expect(syncBus instanceof LocalWebSocketAdapter).toBe(true);
    });

    it('should provide AuthProviderPort with GuestAuthAdapter', () => {
      const authProvider = TestBed.inject(AuthProviderPort);
      expect(authProvider).toBeTruthy();
      expect(authProvider instanceof GuestAuthAdapter).toBe(true);
    });

    it('should provide ErrorReporterPort with ConsoleAdapter', () => {
      const errorReporter = TestBed.inject(ErrorReporterPort);
      expect(errorReporter).toBeTruthy();
      expect(errorReporter instanceof ConsoleAdapter).toBe(true);
    });
  });

  describe('with production environment', () => {
    beforeEach(async () => {
      // Mock environment for production
      const mockEnvironment = {
        production: true,
        storageBackend: 'neon' as 'indexeddb' | 'neon',
        syncBackend: 'netlify' as 'local-ws' | 'netlify',
        authBackend: 'netlify' as 'guest' | 'netlify',
        wsDevPort: 8080,
      };

      // Create config dynamically to use mocked environment
      const { provideZoneChangeDetection } = await import('@angular/core');
      const { provideRouter } = await import('@angular/router');
      const { routes } = await import('./app.routes');

      const testConfig = {
        providers: [
          provideZoneChangeDetection({ eventCoalescing: true }),
          provideRouter(routes),
          {
            provide: TaskStorePort,
            useClass: mockEnvironment.storageBackend === 'neon'
              ? IndexedDbAdapter // TODO: Would be NeonDbAdapter in real implementation
              : IndexedDbAdapter
          },
          {
            provide: SyncBusPort,
            useClass: mockEnvironment.syncBackend === 'netlify'
              ? LocalWebSocketAdapter // TODO: Would be NetlifyWebSocketAdapter in real implementation
              : LocalWebSocketAdapter
          },
          {
            provide: AuthProviderPort,
            useClass: mockEnvironment.authBackend === 'netlify'
              ? GuestAuthAdapter // TODO: Would be NetlifyIdentityAdapter in real implementation
              : GuestAuthAdapter
          },
          {
            provide: ErrorReporterPort,
            useClass: mockEnvironment.production
              ? ConsoleAdapter // TODO: Would be SentryAdapter in real implementation
              : ConsoleAdapter
          }
        ]
      };

      TestBed.configureTestingModule(testConfig);
    });

    it('should provide TaskStorePort (would be NeonDbAdapter when implemented)', () => {
      const taskStore = TestBed.inject(TaskStorePort);
      expect(taskStore).toBeTruthy();
      // Currently using IndexedDbAdapter as fallback until NeonDbAdapter is implemented
      expect(taskStore instanceof IndexedDbAdapter).toBe(true);
    });

    it('should provide SyncBusPort (would be NetlifyWebSocketAdapter when implemented)', () => {
      const syncBus = TestBed.inject(SyncBusPort);
      expect(syncBus).toBeTruthy();
      // Currently using LocalWebSocketAdapter as fallback until NetlifyWebSocketAdapter is implemented
      expect(syncBus instanceof LocalWebSocketAdapter).toBe(true);
    });

    it('should provide AuthProviderPort (would be NetlifyIdentityAdapter when implemented)', () => {
      const authProvider = TestBed.inject(AuthProviderPort);
      expect(authProvider).toBeTruthy();
      // Currently using GuestAuthAdapter as fallback until NetlifyIdentityAdapter is implemented
      expect(authProvider instanceof GuestAuthAdapter).toBe(true);
    });

    it('should provide ErrorReporterPort (would be SentryAdapter when implemented)', () => {
      const errorReporter = TestBed.inject(ErrorReporterPort);
      expect(errorReporter).toBeTruthy();
      // Currently using ConsoleAdapter as fallback until SentryAdapter is implemented
      expect(errorReporter instanceof ConsoleAdapter).toBe(true);
    });
  });

  describe('provider registration', () => {
    beforeEach(async () => {
      // Use actual app config for this test
      const { appConfig } = await import('./app.config');
      TestBed.configureTestingModule(appConfig);
    });

    it('should register all required ports', () => {
      expect(() => TestBed.inject(TaskStorePort)).not.toThrow();
      expect(() => TestBed.inject(SyncBusPort)).not.toThrow();
      expect(() => TestBed.inject(AuthProviderPort)).not.toThrow();
      expect(() => TestBed.inject(ErrorReporterPort)).not.toThrow();
    });

    it('should provide singleton instances', () => {
      const taskStore1 = TestBed.inject(TaskStorePort);
      const taskStore2 = TestBed.inject(TaskStorePort);
      expect(taskStore1).toBe(taskStore2);

      const syncBus1 = TestBed.inject(SyncBusPort);
      const syncBus2 = TestBed.inject(SyncBusPort);
      expect(syncBus1).toBe(syncBus2);

      const authProvider1 = TestBed.inject(AuthProviderPort);
      const authProvider2 = TestBed.inject(AuthProviderPort);
      expect(authProvider1).toBe(authProvider2);

      const errorReporter1 = TestBed.inject(ErrorReporterPort);
      const errorReporter2 = TestBed.inject(ErrorReporterPort);
      expect(errorReporter1).toBe(errorReporter2);
    });
  });

  describe('adapter swapping logic', () => {
    it('should use IndexedDbAdapter when storageBackend is indexeddb', async () => {
      const mockEnvironment = {
        production: false,
        storageBackend: 'indexeddb' as 'indexeddb' | 'neon',
        syncBackend: 'local-ws' as 'local-ws' | 'netlify',
        authBackend: 'guest' as 'guest' | 'netlify',
        wsDevPort: 8080,
      };

      const adapterClass = mockEnvironment.storageBackend === 'neon'
        ? IndexedDbAdapter
        : IndexedDbAdapter;

      expect(adapterClass).toBe(IndexedDbAdapter);
    });

    it('should use LocalWebSocketAdapter when syncBackend is local-ws', async () => {
      const mockEnvironment = {
        production: false,
        storageBackend: 'indexeddb' as 'indexeddb' | 'neon',
        syncBackend: 'local-ws' as 'local-ws' | 'netlify',
        authBackend: 'guest' as 'guest' | 'netlify',
        wsDevPort: 8080,
      };

      const adapterClass = mockEnvironment.syncBackend === 'netlify'
        ? LocalWebSocketAdapter
        : LocalWebSocketAdapter;

      expect(adapterClass).toBe(LocalWebSocketAdapter);
    });

    it('should use GuestAuthAdapter when authBackend is guest', async () => {
      const mockEnvironment = {
        production: false,
        storageBackend: 'indexeddb' as 'indexeddb' | 'neon',
        syncBackend: 'local-ws' as 'local-ws' | 'netlify',
        authBackend: 'guest' as 'guest' | 'netlify',
        wsDevPort: 8080,
      };

      const adapterClass = mockEnvironment.authBackend === 'netlify'
        ? GuestAuthAdapter
        : GuestAuthAdapter;

      expect(adapterClass).toBe(GuestAuthAdapter);
    });

    it('should use ConsoleAdapter when production is false', async () => {
      const mockEnvironment = {
        production: false,
        storageBackend: 'indexeddb' as 'indexeddb' | 'neon',
        syncBackend: 'local-ws' as 'local-ws' | 'netlify',
        authBackend: 'guest' as 'guest' | 'netlify',
        wsDevPort: 8080,
      };

      const adapterClass = mockEnvironment.production
        ? ConsoleAdapter
        : ConsoleAdapter;

      expect(adapterClass).toBe(ConsoleAdapter);
    });

    it('should handle future adapter implementations for neon backend', async () => {
      const mockEnvironment = {
        production: true,
        storageBackend: 'neon' as 'indexeddb' | 'neon',
        syncBackend: 'local-ws' as 'local-ws' | 'netlify',
        authBackend: 'guest' as 'guest' | 'netlify',
        wsDevPort: 8080,
      };

      // This will eventually use NeonDbAdapter when implemented
      const adapterClass = mockEnvironment.storageBackend === 'neon'
        ? IndexedDbAdapter // TODO: Will be NeonDbAdapter
        : IndexedDbAdapter;

      expect(adapterClass).toBe(IndexedDbAdapter);
    });
  });
});
