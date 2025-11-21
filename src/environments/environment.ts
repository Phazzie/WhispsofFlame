export const environment = {
  production: false,
  storageBackend: 'indexeddb' as 'indexeddb' | 'neon',
  syncBackend: 'local-ws' as 'local-ws' | 'netlify',
  authBackend: 'guest' as 'guest' | 'netlify',
  wsDevPort: 8080,
};
