import { firstValueFrom, take, toArray } from 'rxjs';
import * as WS from 'ws';
import { LocalWebSocketAdapter } from './local-ws.adapter';

const WebSocket = WS.WebSocket;
const WebSocketServer = WS.WebSocketServer;
import { SyncMessage } from '../../core/models/sync-message.contract';
import {
  ConnectionError,
  PublishError,
} from '../../core/errors/sync.error';

describe('LocalWebSocketAdapter', () => {
  let server: WS.WebSocketServer;
  let adapter: LocalWebSocketAdapter;
  const TEST_PORT = 8081;
  const TEST_SESSION_ID = 'TEST01';
  const TEST_USER_ID_1 = '00000000-0000-0000-0000-000000000001';
  const TEST_USER_ID_2 = '00000000-0000-0000-0000-000000000002';

  // Helper to create mock task for testing
  const createMockTask = (userId: string) => ({
    id: '10000000-0000-0000-0000-000000000001',
    sessionId: TEST_SESSION_ID,
    content: 'Test task',
    isSecret: false,
    votedBy: [],
    status: 'active' as const,
    createdBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  });

  beforeAll((done) => {
    // Start a test WebSocket server
    server = new WebSocketServer({ port: TEST_PORT });

    const clients = new Map<
      WS.WebSocket,
      { sessionId: string; userId: string }
    >();

    server.on('connection', (ws: WS.WebSocket) => {
      ws.on('message', (rawMessage: Buffer) => {
        try {
          const message = JSON.parse(rawMessage.toString());

          switch (message.type) {
            case 'join':
              clients.set(ws, {
                sessionId: message.sessionId,
                userId: message.userId,
              });
              ws.send(JSON.stringify({ type: 'joined', success: true }));
              break;

            case 'leave':
              clients.delete(ws);
              break;

            case 'message':
              const sender = clients.get(ws);
              if (sender) {
                // Broadcast to all clients in same session except sender
                clients.forEach((client, clientWs) => {
                  if (
                    client.sessionId === sender.sessionId &&
                    clientWs !== ws &&
                    clientWs.readyState === WebSocket.OPEN
                  ) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'message',
                        data: message.data,
                      })
                    );
                  }
                });
              }
              break;
          }
        } catch (error) {
          console.error('Test server error:', error);
        }
      });

      ws.on('error', (error: Error) => {
        console.error('Test server WebSocket error:', error);
      });
    });

    server.on('listening', () => {
      done();
    });
  });

  afterAll((done) => {
    server.close(() => {
      done();
    });
  });

  beforeEach(() => {
    adapter = new LocalWebSocketAdapter();
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  describe('Contract Tests', () => {
    it('should implement SyncBusPort interface', () => {
      expect(adapter.connect).toBeDefined();
      expect(adapter.disconnect).toBeDefined();
      expect(adapter.publish).toBeDefined();
      expect(adapter.subscribe).toBeDefined();
      expect(adapter.status).toBeDefined();
    });

    it('should return Observable from subscribe()', () => {
      const observable = adapter.subscribe();
      expect(observable).toBeDefined();
      expect(typeof observable.subscribe).toBe('function');
    });

    it('should return Observable from status()', () => {
      const observable = adapter.status();
      expect(observable).toBeDefined();
      expect(typeof observable.subscribe).toBe('function');
    });
  });

  describe('Connection Management', () => {
    it('should connect successfully to WebSocket server', async () => {
      const statusPromise = firstValueFrom(adapter.status().pipe(take(2)));

      await adapter.connect(TEST_SESSION_ID, TEST_USER_ID_1);

      const status = await statusPromise;
      expect(status).toBe('connected');
    });

    it('should emit disconnected status initially', (done) => {
      adapter.status().pipe(take(1)).subscribe((status) => {
        expect(status).toBe('disconnected');
        done();
      });
    });

    it('should disconnect cleanly', async () => {
      await adapter.connect(TEST_SESSION_ID, TEST_USER_ID_1);

      const statusPromise = firstValueFrom(
        adapter.status().pipe(take(1))
      );

      await adapter.disconnect();

      const status = await statusPromise;
      expect(status).toBe('disconnected');
    });

    it('should throw ConnectionError when server is unreachable', async () => {
      const badAdapter = new LocalWebSocketAdapter(); // Non-existent server

      try {
        await badAdapter.connect(TEST_SESSION_ID, TEST_USER_ID_1);
        fail('Should have thrown ConnectionError');
      } catch (error) {
        expect(error).toBeInstanceOf(ConnectionError);
      }
    });

    it('should handle reconnection after disconnect', async () => {
      await adapter.connect(TEST_SESSION_ID, TEST_USER_ID_1);
      await adapter.disconnect();

      // Should be able to reconnect
      await adapter.connect(TEST_SESSION_ID, TEST_USER_ID_1);

      const status = await firstValueFrom(adapter.status().pipe(take(1)));
      expect(status).toBe('connected');
    });
  });

  describe('Message Publishing', () => {
    beforeEach(async () => {
      await adapter.connect(TEST_SESSION_ID, TEST_USER_ID_1);
    });

    it('should publish valid TASK_CREATED message', async () => {
      const message: SyncMessage = {
        type: 'TASK_CREATED',
        payload: createMockTask(TEST_USER_ID_1),
        timestamp: new Date().toISOString(),
        userId: TEST_USER_ID_1,
      };

      await adapter.publish(message);
      // No error thrown = success
      expect(true).toBe(true);
    });

    it('should publish valid TASK_UPDATED message', async () => {
      const message: SyncMessage = {
        type: 'TASK_UPDATED',
        payload: createMockTask(TEST_USER_ID_1),
        timestamp: new Date().toISOString(),
        userId: TEST_USER_ID_1,
      };

      await adapter.publish(message);
      // No error thrown = success
      expect(true).toBe(true);
    });

    it('should publish valid TASK_DELETED message', async () => {
      const message: SyncMessage = {
        type: 'TASK_DELETED',
        payload: { id: '10000000-0000-0000-0000-000000000001' },
        timestamp: new Date().toISOString(),
        userId: TEST_USER_ID_1,
      };

      await adapter.publish(message);
      // No error thrown = success
      expect(true).toBe(true);
    });

    it('should publish valid VOTE_REVEAL message', async () => {
      const message: SyncMessage = {
        type: 'VOTE_REVEAL',
        payload: {
          taskId: '10000000-0000-0000-0000-000000000001',
          userId: TEST_USER_ID_1,
        },
        timestamp: new Date().toISOString(),
        userId: TEST_USER_ID_1,
      };

      await adapter.publish(message);
      // No error thrown = success
      expect(true).toBe(true);
    });

    it('should throw PublishError when not connected', async () => {
      await adapter.disconnect();

      const message: SyncMessage = {
        type: 'TASK_CREATED',
        payload: createMockTask(TEST_USER_ID_1),
        timestamp: new Date().toISOString(),
        userId: TEST_USER_ID_1,
      };

      try {
        await adapter.publish(message);
        fail('Should have thrown PublishError');
      } catch (error) {
        expect(error).toBeInstanceOf(PublishError);
      }
    });

    it('should throw PublishError for invalid message format', async () => {
      const invalidMessage = {
        type: 'INVALID_TYPE',
        payload: {},
        timestamp: 'invalid-date',
        userId: 'not-a-uuid',
      } as unknown as SyncMessage;

      try {
        await adapter.publish(invalidMessage);
        fail('Should have thrown PublishError');
      } catch (error) {
        expect(error).toBeInstanceOf(PublishError);
      }
    });
  });

  describe('Message Subscription', () => {
    let adapter2: LocalWebSocketAdapter;

    beforeEach(async () => {
      adapter2 = new LocalWebSocketAdapter();
      await adapter.connect(TEST_SESSION_ID, TEST_USER_ID_1);
      await adapter2.connect(TEST_SESSION_ID, TEST_USER_ID_2);
    });

    afterEach(async () => {
      await adapter2.disconnect();
    });

    it('should receive messages from other users', (done) => {
      const message: SyncMessage = {
        type: 'TASK_CREATED',
        payload: createMockTask(TEST_USER_ID_1),
        timestamp: new Date().toISOString(),
        userId: TEST_USER_ID_1,
      };

      adapter2.subscribe().pipe(take(1)).subscribe((received) => {
        expect(received).toEqual(message);
        done();
      });

      // Give subscription time to set up
      setTimeout(() => {
        adapter.publish(message);
      }, 100);
    });

    it('should NOT receive own messages', (done) => {
      const message: SyncMessage = {
        type: 'TASK_CREATED',
        payload: createMockTask(TEST_USER_ID_1),
        timestamp: new Date().toISOString(),
        userId: TEST_USER_ID_1,
      };

      let receivedCount = 0;

      adapter.subscribe().pipe(take(1)).subscribe(() => {
        receivedCount++;
      });

      adapter.publish(message);

      // Wait and verify no message received
      setTimeout(() => {
        expect(receivedCount).toBe(0);
        done();
      }, 500);
    });

    it('should handle multiple messages in sequence', async () => {
      const messages: SyncMessage[] = [
        {
          type: 'TASK_CREATED',
          payload: createMockTask(TEST_USER_ID_1),
          timestamp: new Date().toISOString(),
          userId: TEST_USER_ID_1,
        },
        {
          type: 'TASK_UPDATED',
          payload: createMockTask(TEST_USER_ID_1),
          timestamp: new Date().toISOString(),
          userId: TEST_USER_ID_1,
        },
        {
          type: 'TASK_DELETED',
          payload: { id: '10000000-0000-0000-0000-000000000001' },
          timestamp: new Date().toISOString(),
          userId: TEST_USER_ID_1,
        },
      ];

      const receivedPromise = firstValueFrom(
        adapter2.subscribe().pipe(take(3), toArray())
      );

      // Give subscription time to set up
      await new Promise((resolve) => setTimeout(resolve, 100));

      for (const message of messages) {
        await adapter.publish(message);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      const received = await receivedPromise;
      expect(received.length).toBe(3);
      expect(received).toEqual(messages);
    });
  });

  describe('Multi-Client Sync', () => {
    let adapter2: LocalWebSocketAdapter;
    let adapter3: LocalWebSocketAdapter;
    const TEST_USER_ID_3 = '00000000-0000-0000-0000-000000000003';

    beforeEach(async () => {
      adapter2 = new LocalWebSocketAdapter();
      adapter3 = new LocalWebSocketAdapter();

      await adapter.connect(TEST_SESSION_ID, TEST_USER_ID_1);
      await adapter2.connect(TEST_SESSION_ID, TEST_USER_ID_2);
      await adapter3.connect(TEST_SESSION_ID, TEST_USER_ID_3);
    });

    afterEach(async () => {
      await adapter2.disconnect();
      await adapter3.disconnect();
    });

    it('should broadcast message to all clients in same session', (done) => {
      const message: SyncMessage = {
        type: 'TASK_CREATED',
        payload: createMockTask(TEST_USER_ID_1),
        timestamp: new Date().toISOString(),
        userId: TEST_USER_ID_1,
      };

      let received2 = false;
      let received3 = false;

      adapter2.subscribe().pipe(take(1)).subscribe((received) => {
        expect(received).toEqual(message);
        received2 = true;
        checkComplete();
      });

      adapter3.subscribe().pipe(take(1)).subscribe((received) => {
        expect(received).toEqual(message);
        received3 = true;
        checkComplete();
      });

      function checkComplete() {
        if (received2 && received3) {
          done();
        }
      }

      // Give subscriptions time to set up
      setTimeout(() => {
        adapter.publish(message);
      }, 100);
    });

    it('should handle bidirectional communication', async () => {
      const message1: SyncMessage = {
        type: 'TASK_CREATED',
        payload: createMockTask(TEST_USER_ID_1),
        timestamp: new Date().toISOString(),
        userId: TEST_USER_ID_1,
      };

      const message2: SyncMessage = {
        type: 'TASK_UPDATED',
        payload: createMockTask(TEST_USER_ID_2),
        timestamp: new Date().toISOString(),
        userId: TEST_USER_ID_2,
      };

      const received1Promise = firstValueFrom(
        adapter2.subscribe().pipe(take(1))
      );
      const received2Promise = firstValueFrom(
        adapter.subscribe().pipe(take(1))
      );

      // Give subscriptions time to set up
      await new Promise((resolve) => setTimeout(resolve, 100));

      await adapter.publish(message1);
      await adapter2.publish(message2);

      const received1 = await received1Promise;
      const received2 = await received2Promise;

      expect(received1).toEqual(message1);
      expect(received2).toEqual(message2);
    });
  });

  describe('Error Handling', () => {
    it('should handle connection timeout gracefully', async () => {
      // Create adapter that will timeout (server won't exist)
      const slowAdapter = new LocalWebSocketAdapter();

      try {
        await slowAdapter.connect(TEST_SESSION_ID, TEST_USER_ID_1);
        fail('Should have thrown ConnectionError');
      } catch (error) {
        expect(error).toBeInstanceOf(ConnectionError);
      }
    }, 10000);

    it('should handle disconnect when not connected', async () => {
      const newAdapter = new LocalWebSocketAdapter();

      await newAdapter.disconnect();
      // No error thrown = success
      expect(true).toBe(true);
    });

    it('should validate message schema before publishing', async () => {
      await adapter.connect(TEST_SESSION_ID, TEST_USER_ID_1);

      const invalidMessage = {
        type: 'TASK_CREATED',
        payload: {
          // Missing required fields
          id: 'not-a-uuid',
        },
        timestamp: 'invalid-timestamp',
        userId: 'not-a-uuid',
      } as unknown as SyncMessage;

      try {
        await adapter.publish(invalidMessage);
        fail('Should have thrown PublishError');
      } catch (error) {
        expect(error).toBeInstanceOf(PublishError);
      }
    });
  });

  describe('Status Observable', () => {
    it('should emit status changes during connection lifecycle', async () => {
      const statusPromise = firstValueFrom(
        adapter.status().pipe(take(3), toArray())
      );

      await adapter.connect(TEST_SESSION_ID, TEST_USER_ID_1);
      await adapter.disconnect();

      const statuses = await statusPromise;

      // Should see: initial disconnected, connected, disconnected
      expect(statuses).toContain('connected');
      expect(statuses).toContain('disconnected');
    });
  });
});
