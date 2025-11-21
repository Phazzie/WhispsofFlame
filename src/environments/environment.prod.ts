export const environment = {
  production: true,
  storageBackend: 'neon' as 'indexeddb' | 'neon',
  syncBackend: 'netlify' as 'local-ws' | 'netlify',
  authBackend: 'netlify' as 'guest' | 'netlify',
  wsDevPort: 8080,
};
