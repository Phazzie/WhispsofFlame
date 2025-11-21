import { Observable } from 'rxjs';
import { SyncMessage } from '../models/sync-message.contract';

export abstract class SyncBusPort {
  /**
   * Connect to sync channel for a session
   * @throws {ConnectionError} if connection fails
   */
  abstract connect(sessionId: string, userId: string): Promise<void>;

  /**
   * Disconnect from current session
   */
  abstract disconnect(): Promise<void>;

  /**
   * Publish a message to the session
   * @throws {PublishError} if publish fails
   */
  abstract publish(message: SyncMessage): Promise<void>;

  /**
   * Subscribe to messages for current session
   * Emits messages from other users only
   */
  abstract subscribe(): Observable<SyncMessage>;

  /**
   * Get connection status
   */
  abstract status(): Observable<'connected' | 'disconnected' | 'error'>;
}
