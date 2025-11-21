import { WebSocketServer, WebSocket } from 'ws';

interface ClientConnection {
  ws: WebSocket;
  sessionId: string;
  userId: string;
}

interface ServerMessage {
  type: 'join' | 'leave' | 'message';
  sessionId?: string;
  userId?: string;
  data?: unknown;
}

const PORT = parseInt(process.env['WS_PORT'] || '8080', 10);
const clients = new Map<WebSocket, ClientConnection>();

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws: WebSocket) => {
  console.log('[WS] New connection established');

  ws.on('message', (rawMessage: Buffer) => {
    try {
      const message = JSON.parse(rawMessage.toString()) as ServerMessage;

      switch (message.type) {
        case 'join':
          if (message.sessionId && message.userId) {
            clients.set(ws, {
              ws,
              sessionId: message.sessionId,
              userId: message.userId,
            });
            console.log(
              `[WS] Client joined - Session: ${message.sessionId}, User: ${message.userId}`
            );
            ws.send(JSON.stringify({ type: 'joined', success: true }));
          }
          break;

        case 'leave':
          clients.delete(ws);
          console.log('[WS] Client left');
          break;

        case 'message':
          const sender = clients.get(ws);
          if (sender) {
            // Broadcast to all clients in the same session except sender
            broadcastToSession(sender.sessionId, message.data, ws);
          }
          break;

        default:
          console.warn('[WS] Unknown message type:', message);
      }
    } catch (error) {
      console.error('[WS] Error processing message:', error);
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        })
      );
    }
  });

  ws.on('close', () => {
    const client = clients.get(ws);
    if (client) {
      console.log(
        `[WS] Connection closed - Session: ${client.sessionId}, User: ${client.userId}`
      );
      clients.delete(ws);
    } else {
      console.log('[WS] Connection closed (unregistered client)');
    }
  });

  ws.on('error', (error) => {
    console.error('[WS] WebSocket error:', error);
    clients.delete(ws);
  });
});

function broadcastToSession(
  sessionId: string,
  data: unknown,
  sender: WebSocket
): void {
  let broadcastCount = 0;

  clients.forEach((client) => {
    if (client.sessionId === sessionId && client.ws !== sender) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(
          JSON.stringify({
            type: 'message',
            data,
          })
        );
        broadcastCount++;
      }
    }
  });

  console.log(
    `[WS] Broadcasted message to ${broadcastCount} clients in session ${sessionId}`
  );
}

wss.on('listening', () => {
  console.log(`[WS] WebSocket server listening on port ${PORT}`);
});

wss.on('error', (error) => {
  console.error('[WS] Server error:', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[WS] SIGTERM received, closing server...');
  wss.close(() => {
    console.log('[WS] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[WS] SIGINT received, closing server...');
  wss.close(() => {
    console.log('[WS] Server closed');
    process.exit(0);
  });
});
