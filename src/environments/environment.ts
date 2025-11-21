export const environment = {
  production: false,
  storageBackend: 'indexeddb' as 'indexeddb' | 'neon',
  syncBackend: 'netlify' as 'local-ws' | 'netlify',
  authBackend: 'guest' as 'guest' | 'netlify',
  wsDevPort: 8080,
  wsUrl: 'ws://localhost:8080',
  pusherKey: '',
  pusherCluster: '',
  ablyKey: '', // Add your Ably API Key here for local dev (or use authUrl)
  ablyAuthUrl: '', // '/api/ably-token' if using Netlify Functions
};
