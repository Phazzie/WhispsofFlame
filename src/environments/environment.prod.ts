export const environment = {
  production: true,
  storageBackend: 'indexeddb' as 'indexeddb' | 'neon', // Not 'neon' until implemented
  syncBackend: 'local-ws' as 'local-ws' | 'netlify',   // Not 'netlify' until implemented
  authBackend: 'guest' as 'guest' | 'netlify',         // Not 'netlify' until implemented
  wsDevPort: 8080,
};
