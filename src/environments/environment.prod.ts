export const environment = {
  production: true,
  storageBackend: 'indexeddb' as 'indexeddb' | 'neon', // Not 'neon' until implemented
  syncBackend: 'netlify' as 'local-ws' | 'netlify',
  authBackend: 'guest' as 'guest' | 'netlify',         // Not 'netlify' until implemented
  wsDevPort: 8080,
  wsUrl: 'wss://your-backend-url.com',
  pusherKey: 'YOUR_PROD_PUSHER_KEY',
  pusherCluster: 'YOUR_PROD_PUSHER_CLUSTER',
  ablyKey: '',
  ablyAuthUrl: '/.netlify/functions/ably-token',
};
