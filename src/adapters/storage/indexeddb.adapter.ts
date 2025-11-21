import { Injectable } from '@angular/core';
import { openDB, IDBPDatabase } from 'idb';
import { BehaviorSubject, Observable } from 'rxjs';
import { TaskStorePort } from '../../core/ports/task-store.port';
import { Task, TaskSchemaV1 } from '../../core/models/task.contract';
import { StorageError, ConflictError } from '../../core/errors';
import { ErrorReporterPort } from '../../core/ports/error-reporter.port';
import { getErrorMessage } from '../../shared/utils/error.util';
import { getCurrentTimestamp } from '../../shared/utils/timestamp.util';

const DB_NAME = 'whisps-db';
const STORE_NAME = 'tasks';
const DB_VERSION = 1;

interface TaskStoreSchema {
  tasks: {
    key: string;
    value: Task;
    indexes: {
      'by-session': string;
    };
  };
}

@Injectable()
export class IndexedDbAdapter extends TaskStorePort {
  private db: IDBPDatabase<TaskStoreSchema> | null = null;
  private sessionSubjects = new Map<string, BehaviorSubject<Task[]>>();

  constructor(private errorReporter: ErrorReporterPort) {
    super();
  }

  /**
   * Initialize the IndexedDB database
   */
  private async initDb(): Promise<IDBPDatabase<TaskStoreSchema>> {
    if (this.db) {
      return this.db;
    }

    try {
      this.db = await openDB<TaskStoreSchema>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Create object store if it doesn't exist
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, {
              keyPath: 'id',
            });
            // Create index for sessionId lookups
            store.createIndex('by-session', 'sessionId', { unique: false });
          }
        },
      });

      return this.db;
    } catch (error) {
      this.handleStorageError(error, 'initialize IndexedDB', {
        dbName: DB_NAME,
      });
    }
  }

  /**
   * List all tasks for a session
   */
  async listBySession(sessionId: string): Promise<Task[]> {
    try {
      const db = await this.initDb();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const index = tx.store.index('by-session');
      const tasks = await index.getAll(sessionId);
      await tx.done;

      // Validate all tasks
      const validatedTasks = tasks.map((task) => {
        try {
          return TaskSchemaV1.parse(task);
        } catch (error) {
          throw new StorageError(
            `Invalid task data in storage: ${getErrorMessage(error, 'Unknown validation error')}`
          );
        }
      });

      return validatedTasks;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }

      this.handleStorageError(error, 'list tasks by session', { sessionId });
    }
  }

  /**
   * Save a task (create or update)
   */
  async save(task: Task): Promise<Task> {
    // Validate input
    let validatedTask: Task;
    try {
      validatedTask = TaskSchemaV1.parse(task);
    } catch (error) {
      this.handleStorageError(error, 'validate task data', {
        taskId: task.id,
      });
    }

    try {
      const db = await this.initDb();
      const tx = db.transaction(STORE_NAME, 'readwrite');

      // Check for existing task and version conflict
      const existingTask = await tx.store.get(validatedTask.id);

      if (existingTask) {
        // Optimistic concurrency check
        if (existingTask.version !== validatedTask.version) {
          throw new ConflictError(
            `Version mismatch for task ${validatedTask.id}: expected ${existingTask.version}, got ${validatedTask.version}`
          );
        }

        // Increment version for update
        validatedTask = {
          ...validatedTask,
          version: validatedTask.version + 1,
          updatedAt: getCurrentTimestamp(),
        };
      }

      await tx.store.put(validatedTask);
      await tx.done;

      // Notify watchers
      await this.notifyWatchers(validatedTask.sessionId);

      return validatedTask;
    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }

      // Check for quota exceeded error
      if (
        error instanceof Error &&
        (error.name === 'QuotaExceededError' ||
          (error as DOMException).name === 'QuotaExceededError')
      ) {
        this.handleStorageError(error, 'save task (quota exceeded)', {
          taskId: validatedTask.id,
          errorType: 'QuotaExceededError',
        });
      }

      this.handleStorageError(error, 'save task', {
        taskId: validatedTask.id,
      });
    }
  }

  /**
   * Delete a task
   */
  async delete(taskId: string): Promise<void> {
    try {
      const db = await this.initDb();
      const tx = db.transaction(STORE_NAME, 'readwrite');

      // Get the task to find its sessionId before deleting
      const task = await tx.store.get(taskId);

      await tx.store.delete(taskId);
      await tx.done;

      // Notify watchers if task existed
      if (task) {
        await this.notifyWatchers(task.sessionId);
      }
    } catch (error) {
      this.handleStorageError(error, 'delete task', { taskId });
    }
  }

  /**
   * Watch for changes to tasks in a session
   */
  watch(sessionId: string): Observable<Task[]> {
    // Get or create subject for this session
    if (!this.sessionSubjects.has(sessionId)) {
      const subject = new BehaviorSubject<Task[]>([]);
      this.sessionSubjects.set(sessionId, subject);

      // Initialize with current tasks
      this.listBySession(sessionId)
        .then((tasks) => subject.next(tasks))
        .catch((error) => {
          this.errorReporter.captureException(error, {
            operation: 'watch-init',
            sessionId,
          });
        });
    }

    return this.sessionSubjects.get(sessionId)!.asObservable();
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    try {
      const db = await this.initDb();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      await tx.store.clear();
      await tx.done;

      // Notify all watchers
      for (const [sessionId, subject] of this.sessionSubjects.entries()) {
        subject.next([]);
      }
    } catch (error) {
      this.handleStorageError(error, 'clear storage');
    }
  }

  /**
   * Notify watchers of changes to a session's tasks
   */
  private async notifyWatchers(sessionId: string): Promise<void> {
    const subject = this.sessionSubjects.get(sessionId);
    if (subject) {
      try {
        const tasks = await this.listBySession(sessionId);
        subject.next(tasks);
      } catch (error) {
        this.errorReporter.captureException(error as Error, {
          operation: 'notifyWatchers',
          sessionId,
        });
      }
    }
  }

  /**
   * Handle storage errors consistently
   */
  private handleStorageError(
    error: unknown,
    operation: string,
    context?: Record<string, unknown>
  ): never {
    const storageError = new StorageError(
      `Failed to ${operation}: ${getErrorMessage(error)}`
    );
    this.errorReporter.captureException(storageError, {
      operation,
      ...context,
    });
    throw storageError;
  }
}
