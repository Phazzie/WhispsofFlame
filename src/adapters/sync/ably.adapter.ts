import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import * as Ably from 'ably';
import { SyncBusPort } from '../../core/ports/sync-bus.port';
import {
  SyncMessage,
  SyncMessageSchemaV1,
} from '../../core/models/sync-message.contract';
import {
  ConnectionError,
  PublishError,
} from '../../core/errors/sync.error';
import { environment } from '../../environments/environment';

@Injectable()
export class AblyAdapter extends SyncBusPort {
  private client: Ably.Realtime | null = null;
  private channel: Ably.RealtimeChannel | null = null;
  private messageSubject = new Subject<SyncMessage>();
  private statusSubject = new Subject<'connected' | 'disconnected' | 'error'>();
  private currentUserId: string | null = null;

  constructor() {
    super();
    this.statusSubject.next('disconnected');
  }

  async connect(sessionId: string, userId: string): Promise<void> {
    if (this.client) {
      await this.disconnect();
    }

    return new Promise((resolve, reject) => {
      try {
        // Initialize Ably
        // For Netlify integration, we typically use authUrl to fetch a token
        // or use the key directly if configured that way (less secure for frontend)
        const clientOptions: Ably.ClientOptions = environment.ablyAuthUrl
          ? { authUrl: environment.ablyAuthUrl }
          : { key: environment.ablyKey };

        // If neither is present, we can't connect
        if (!clientOptions.authUrl && !clientOptions.key) {
           throw new Error('Ably configuration missing. Set ablyKey or ablyAuthUrl in environment.');
        }

        this.client = new Ably.Realtime({
            ...clientOptions,
            clientId: userId // Identify the client by userId
        });

        this.currentUserId = userId;

        // Connection state handling
        this.client.connection.on('connected', () => {
          this.statusSubject.next('connected');
          resolve();
        });

        this.client.connection.on('disconnected', () => {
          this.statusSubject.next('disconnected');
        });

        this.client.connection.on('failed', (stateChange) => {
          this.statusSubject.next('error');
          reject(new ConnectionError(`Ably connection failed: ${stateChange.reason}`));
        });

        this.client.connection.on('suspended', () => {
             this.statusSubject.next('disconnected');
        });


        // Subscribe to the session channel
        const channelName = `session-${sessionId}`;
        this.channel = this.client.channels.get(channelName);

        // Subscribe to messages
        this.channel.subscribe('sync-event', (message) => {
          this.handleIncomingMessage(message.data);
        });

      } catch (error) {
        reject(new ConnectionError(`Failed to initialize Ably: ${error}`));
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.close();
      this.client = null;
      this.channel = null;
      this.currentUserId = null;
      this.statusSubject.next('disconnected');
    }
  }

  async publish(message: SyncMessage): Promise<void> {
    if (!this.channel || !this.client) {
      throw new PublishError('Not connected to Ably');
    }

    // Validate message
    const parseResult = SyncMessageSchemaV1.safeParse(message);
    if (!parseResult.success) {
      throw new PublishError(`Invalid message format: ${parseResult.error.message}`);
    }

    try {
      await this.channel.publish('sync-event', message);
    } catch (error) {
      throw new PublishError(`Ably publish error: ${error}`);
    }
  }

  subscribe(): Observable<SyncMessage> {
    return this.messageSubject.asObservable();
  }

  status(): Observable<'connected' | 'disconnected' | 'error'> {
    return this.statusSubject.asObservable();
  }

  private handleIncomingMessage(data: unknown): void {
    const parseResult = SyncMessageSchemaV1.safeParse(data);
    if (parseResult.success) {
      // Only emit messages from other users
      if (parseResult.data.userId !== this.currentUserId) {
        this.messageSubject.next(parseResult.data);
      }
    } else {
      console.warn('[Ably] Invalid message received:', parseResult.error);
    }
  }
}
