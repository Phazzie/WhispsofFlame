import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import * as WS from 'ws';
import { SyncBusPort } from '../../core/ports/sync-bus.port';
import {
  SyncMessage,
  SyncMessageSchemaV1,
} from '../../core/models/sync-message.contract';
import {
  ConnectionError,
  PublishError,
} from '../../core/errors/sync.error';

type ConnectionStatus = 'connected' | 'disconnected' | 'error';
type WebSocket = WS.WebSocket;
const WebSocket = WS.WebSocket;

interface ServerMessage {
  type: 'joined' | 'message' | 'error';
  data?: unknown;
  success?: boolean;
  message?: string;
}

@Injectable()
export class LocalWebSocketAdapter extends SyncBusPort {
  private ws: WebSocket | null = null;
  private messageSubject = new Subject<SyncMessage>();
  private statusSubject = new Subject<ConnectionStatus>();
  private currentSessionId: string | null = null;
  private currentUserId: string | null = null;
  private readonly port: number = 8080;

  constructor() {
    super();
    this.statusSubject.next('disconnected');
  }

  async connect(sessionId: string, userId: string): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      await this.disconnect();
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`ws://localhost:${this.port}`);

        const joinTimeout = setTimeout(() => {
          this.ws?.close();
          reject(
            new ConnectionError(
              `Connection timeout after 5000ms for session ${sessionId}`
            )
          );
        }, 5000);

        this.ws.on('open', () => {
          if (!this.ws) {
            clearTimeout(joinTimeout);
            reject(new ConnectionError('WebSocket is null after open event'));
            return;
          }

          // Send join message
          this.ws.send(
            JSON.stringify({
              type: 'join',
              sessionId,
              userId,
            })
          );
        });

        this.ws.on('message', (rawMessage: Buffer) => {
          try {
            const message = JSON.parse(rawMessage.toString()) as ServerMessage;

            if (message.type === 'joined' && message.success) {
              clearTimeout(joinTimeout);
              this.currentSessionId = sessionId;
              this.currentUserId = userId;
              this.statusSubject.next('connected');
              resolve();
            } else if (message.type === 'message' && message.data) {
              // Validate incoming message
              const parseResult = SyncMessageSchemaV1.safeParse(message.data);
              if (parseResult.success) {
                // Only emit messages from other users
                if (parseResult.data.userId !== this.currentUserId) {
                  this.messageSubject.next(parseResult.data);
                }
              } else {
                console.warn(
                  '[LocalWS] Invalid message received:',
                  parseResult.error
                );
              }
            } else if (message.type === 'error') {
              console.error('[LocalWS] Server error:', message.message);
              this.statusSubject.next('error');
            }
          } catch (error) {
            console.error('[LocalWS] Error parsing message:', error);
          }
        });

        this.ws.on('close', () => {
          clearTimeout(joinTimeout);
          this.statusSubject.next('disconnected');
          this.currentSessionId = null;
          this.currentUserId = null;
        });

        this.ws.on('error', (error) => {
          clearTimeout(joinTimeout);
          this.statusSubject.next('error');
          reject(
            new ConnectionError(
              `WebSocket error for session ${sessionId}: ${error.message}`
            )
          );
        });
      } catch (error) {
        reject(
          new ConnectionError(
            `Failed to create WebSocket connection: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        );
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      return new Promise((resolve) => {
        if (!this.ws) {
          resolve();
          return;
        }

        if (this.ws.readyState === WebSocket.OPEN) {
          // Send leave message
          this.ws.send(JSON.stringify({ type: 'leave' }));

          this.ws.on('close', () => {
            this.ws = null;
            this.currentSessionId = null;
            this.currentUserId = null;
            this.statusSubject.next('disconnected');
            resolve();
          });

          this.ws.close();
        } else {
          this.ws = null;
          this.currentSessionId = null;
          this.currentUserId = null;
          this.statusSubject.next('disconnected');
          resolve();
        }
      });
    }
  }

  async publish(message: SyncMessage): Promise<void> {
    // Validate message before sending
    const parseResult = SyncMessageSchemaV1.safeParse(message);
    if (!parseResult.success) {
      throw new PublishError(
        `Invalid message format: ${parseResult.error.message}`
      );
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new PublishError('WebSocket is not connected');
    }

    return new Promise((resolve, reject) => {
      try {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          reject(new PublishError('WebSocket is not connected'));
          return;
        }

        this.ws.send(
          JSON.stringify({
            type: 'message',
            data: message,
          }),
          (error) => {
            if (error) {
              reject(
                new PublishError(
                  `Failed to send message: ${
                    error instanceof Error ? error.message : String(error)
                  }`
                )
              );
            } else {
              resolve();
            }
          }
        );
      } catch (error) {
        reject(
          new PublishError(
            `Failed to publish message: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        );
      }
    });
  }

  subscribe(): Observable<SyncMessage> {
    return this.messageSubject.asObservable();
  }

  status(): Observable<ConnectionStatus> {
    return this.statusSubject.asObservable();
  }
}
