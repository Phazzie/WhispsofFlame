import { Observable } from 'rxjs';
import { Task } from '../models/task.contract';

/**
 * TaskStore Port v1.0
 * Persistence abstraction for tasks
 */
export abstract class TaskStorePort {
  /**
   * List all tasks for a session
   * @throws {StorageError} if underlying storage fails
   */
  abstract listBySession(sessionId: string): Promise<Task[]>;

  /**
   * Save a task (create or update)
   * @throws {StorageError} if save fails
   * @throws {ConflictError} if version mismatch
   */
  abstract save(task: Task): Promise<Task>;

  /**
   * Delete a task
   * @throws {StorageError} if delete fails
   */
  abstract delete(taskId: string): Promise<void>;

  /**
   * Watch for changes to tasks in a session
   * Emits full task list on any change
   */
  abstract watch(sessionId: string): Observable<Task[]>;

  /**
   * Clear all data (for testing/cleanup)
   */
  abstract clear(): Promise<void>;
}
