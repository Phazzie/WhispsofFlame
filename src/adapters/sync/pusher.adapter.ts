import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import Pusher, { Channel } from 'pusher-js';
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
export class PusherAdapter extends SyncBusPort {
  private pusher: Pusher | null = null;
  private channel: Channel | null = null;
  private messageSubject = new Subject<SyncMessage>();
  private statusSubject = new Subject<'connected' | 'disconnected' | 'error'>();
  private currentUserId: string | null = null;

  constructor() {
    super();
    this.statusSubject.next('disconnected');
  }

  async connect(sessionId: string, userId: string): Promise<void> {
    if (this.pusher) {
      await this.disconnect();
    }

    return new Promise((resolve, reject) => {
      try {
        // Initialize Pusher
        // Note: In a real app, key and cluster should come from environment
        const PUSHER_KEY = environment.pusherKey || 'YOUR_PUSHER_KEY';
        const PUSHER_CLUSTER = environment.pusherCluster || 'mt1';

        this.pusher = new Pusher(PUSHER_KEY, {
          cluster: PUSHER_CLUSTER,
        });

        this.currentUserId = userId;

        // Subscribe to the session channel
        // Pusher channel names cannot contain certain characters, so we might need to sanitize
        const channelName = `session-${sessionId}`;
        this.channel = this.pusher.subscribe(channelName);

        this.channel.bind('pusher:subscription_succeeded', () => {
          this.statusSubject.next('connected');
          resolve();
        });

        this.channel.bind('pusher:subscription_error', (error: any) => {
          this.statusSubject.next('error');
          reject(new ConnectionError(`Pusher subscription error: ${error}`));
        });

        // Listen for sync events
        this.channel.bind('client-sync-event', (data: unknown) => {
          this.handleIncomingMessage(data);
        });

        // Connection state handling
        this.pusher.connection.bind('state_change', (states: any) => {
          if (states.current === 'connected') {
            this.statusSubject.next('connected');
          } else if (states.current === 'disconnected') {
            this.statusSubject.next('disconnected');
          } else if (states.current === 'failed') {
            this.statusSubject.next('error');
          }
        });

      } catch (error) {
        reject(new ConnectionError(`Failed to initialize Pusher: ${error}`));
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.pusher) {
      this.pusher.disconnect();
      this.pusher = null;
      this.channel = null;
      this.currentUserId = null;
      this.statusSubject.next('disconnected');
    }
  }

  async publish(message: SyncMessage): Promise<void> {
    if (!this.channel || !this.pusher) {
      throw new PublishError('Not connected to Pusher');
    }

    // Validate message
    const parseResult = SyncMessageSchemaV1.safeParse(message);
    if (!parseResult.success) {
      throw new PublishError(`Invalid message format: ${parseResult.error.message}`);
    }

    try {
      // Trigger client event (must start with 'client-')
      // Note: Client events require 'App Settings > Enable Client Events' in Pusher dashboard
      const success = this.channel.trigger('client-sync-event', message);

      if (!success) {
        throw new PublishError('Failed to trigger Pusher event');
      }
    } catch (error) {
      throw new PublishError(`Pusher publish error: ${error}`);
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
      console.warn('[Pusher] Invalid message received:', parseResult.error);
    }
  }
}
