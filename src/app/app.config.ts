import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { environment } from '../environments/environment';

// Import ports
import { TaskStorePort } from '../core/ports/task-store.port';
import { SyncBusPort } from '../core/ports/sync-bus.port';
import { AuthProviderPort } from '../core/ports/auth-provider.port';
import { ErrorReporterPort } from '../core/ports/error-reporter.port';

// Import adapters
import { IndexedDbAdapter } from '../adapters/storage/indexeddb.adapter';
import { LocalWebSocketAdapter } from '../adapters/sync/local-ws.adapter';
import { GuestAuthAdapter } from '../adapters/auth/guest-auth.adapter';
import { ConsoleAdapter } from '../adapters/errors/console.adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),

    // Storage adapter swap
    {
      provide: TaskStorePort,
      useClass: environment.storageBackend === 'neon'
        ? IndexedDbAdapter // TODO: NeonDbAdapter when ready
        : IndexedDbAdapter
    },

    // Sync adapter swap
    {
      provide: SyncBusPort,
      useClass: environment.syncBackend === 'netlify'
        ? LocalWebSocketAdapter // TODO: NetlifyWebSocketAdapter when ready
        : LocalWebSocketAdapter
    },

    // Auth adapter swap
    {
      provide: AuthProviderPort,
      useClass: environment.authBackend === 'netlify'
        ? GuestAuthAdapter // TODO: NetlifyIdentityAdapter when ready
        : GuestAuthAdapter
    },

    // Error reporter swap
    {
      provide: ErrorReporterPort,
      useClass: environment.production
        ? ConsoleAdapter // TODO: SentryAdapter when ready
        : ConsoleAdapter
    }
  ]
};
