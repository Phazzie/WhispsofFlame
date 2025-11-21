import { Injectable, signal, computed } from '@angular/core';
import { Subscription } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Task, TaskSchemaV1, taskIsRevealed } from '../models/task.contract';
import { SyncMessage, SyncMessageSchemaV1 } from '../models/sync-message.contract';
import { TaskStorePort } from '../ports/task-store.port';
import { SyncBusPort } from '../ports/sync-bus.port';
import { AuthProviderPort } from '../ports/auth-provider.port';
import { ConflictError } from '../errors';

/**
 * TaskService v1.0
 * Business logic layer that orchestrates TaskStore + SyncBus + Auth
 */
@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private tasksSignal = signal<Task[]>([]);
  public tasks = this.tasksSignal.asReadonly();

  public activeTasks = computed(() =>
    this.tasks().filter((t) => t.status === 'active')
  );

  public secretTasks = computed(() =>
    this.tasks().filter((t) => t.isSecret && !taskIsRevealed(t))
  );

  private currentSessionId: string | null = null;
  private syncSubscription: Subscription | null = null;

  constructor(
    private taskStore: TaskStorePort,
    private syncBus: SyncBusPort,
    private authProvider: AuthProviderPort
  ) {}

  /**
   * Join a session and load tasks
   * @throws {AuthError} if user not authenticated
   * @throws {ConnectionError} if sync connection fails
   * @throws {StorageError} if task loading fails
   */
  async joinSession(sessionId: string): Promise<void> {
    const user = await this.authProvider.currentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Connect to sync bus
    await this.syncBus.connect(sessionId, user.id);

    // Load existing tasks
    const tasks = await this.taskStore.listBySession(sessionId);

    // Validate all tasks
    tasks.forEach((task) => TaskSchemaV1.parse(task));

    // Update signal
    this.tasksSignal.set(tasks);
    this.currentSessionId = sessionId;

    // Subscribe to sync messages
    this.syncSubscription = this.syncBus.subscribe().subscribe({
      next: (message) => this.handleSyncMessage(message),
      error: (err) => console.error('Sync error:', err),
    });
  }

  /**
   * Create a new task
   * @throws {AuthError} if user not authenticated
   * @throws {StorageError} if save fails
   * @throws {PublishError} if sync publish fails
   */
  async createTask(content: string, isSecret: boolean): Promise<Task> {
    const user = await this.authProvider.currentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    if (!this.currentSessionId) {
      throw new Error('No active session');
    }

    const now = new Date().toISOString();
    const task: Task = {
      id: uuidv4(),
      sessionId: this.currentSessionId,
      content,
      isSecret,
      votedBy: [],
      status: 'active',
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    // Validate task
    TaskSchemaV1.parse(task);

    // Save to store
    const savedTask = await this.taskStore.save(task);

    // Publish sync message
    const syncMessage: SyncMessage = {
      type: 'TASK_CREATED',
      payload: savedTask,
      timestamp: new Date().toISOString(),
      userId: user.id,
    };
    SyncMessageSchemaV1.parse(syncMessage);
    await this.syncBus.publish(syncMessage);

    // Optimistically update signal
    this.tasksSignal.update((tasks) => [...tasks, savedTask]);

    return savedTask;
  }

  /**
   * Update an existing task
   * @throws {StorageError} if save fails
   * @throws {ConflictError} if version mismatch
   * @throws {PublishError} if sync publish fails
   */
  async updateTask(task: Task): Promise<Task> {
    const user = await this.authProvider.currentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const updatedTask: Task = {
      ...task,
      updatedAt: new Date().toISOString(),
      // Don't increment version here (handled by adapter)
    };

    TaskSchemaV1.parse(updatedTask);

    try {
      const savedTask = await this.taskStore.save(updatedTask);

      const syncMessage: SyncMessage = {
        type: 'TASK_UPDATED',
        payload: savedTask,
        timestamp: new Date().toISOString(),
        userId: user.id,
      };
      SyncMessageSchemaV1.parse(syncMessage);
      await this.syncBus.publish(syncMessage);

      // Update local signal
      this.tasksSignal.update((tasks) =>
        tasks.map((t) => (t.id === savedTask.id ? savedTask : t))
      );

      return savedTask;
    } catch (error) {
      // Handle version conflict by reloading from storage
      if (error instanceof ConflictError) {
        console.warn('Version conflict detected, reloading tasks', error);

        if (this.currentSessionId) {
          const tasks = await this.taskStore.listBySession(this.currentSessionId);
          this.tasksSignal.set(tasks);
        }
      }

      throw error; // Re-throw to notify caller
    }
  }

  /**
   * Delete a task
   * @throws {StorageError} if delete fails
   * @throws {PublishError} if sync publish fails
   */
  async deleteTask(taskId: string): Promise<void> {
    const user = await this.authProvider.currentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Delete from store
    await this.taskStore.delete(taskId);

    // Publish sync message
    const syncMessage: SyncMessage = {
      type: 'TASK_DELETED',
      payload: { id: taskId },
      timestamp: new Date().toISOString(),
      userId: user.id,
    };
    SyncMessageSchemaV1.parse(syncMessage);
    await this.syncBus.publish(syncMessage);

    // Update signal
    this.tasksSignal.update((tasks) => tasks.filter((t) => t.id !== taskId));
  }

  /**
   * Vote to reveal a secret task
   * @throws {Error} if task not found
   */
  async voteReveal(taskId: string): Promise<void> {
    const user = await this.authProvider.currentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const task = this.tasks().find((t) => t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Add user to votedBy array if not already present
    if (!task.votedBy.includes(user.id)) {
      const updatedTask: Task = {
        ...task,
        votedBy: [...task.votedBy, user.id],
      };

      await this.updateTask(updatedTask);

      // Publish VOTE_REVEAL sync message
      const syncMessage: SyncMessage = {
        type: 'VOTE_REVEAL',
        payload: {
          taskId: task.id,
          userId: user.id,
        },
        timestamp: new Date().toISOString(),
        userId: user.id,
      };
      SyncMessageSchemaV1.parse(syncMessage);
      await this.syncBus.publish(syncMessage);
    }
  }

  /**
   * Leave the current session
   */
  async leaveSession(): Promise<void> {
    // Disconnect from sync bus
    await this.syncBus.disconnect();

    // Unsubscribe from sync messages
    if (this.syncSubscription) {
      this.syncSubscription.unsubscribe();
      this.syncSubscription = null;
    }

    // Clear tasks signal
    this.tasksSignal.set([]);
    this.currentSessionId = null;
  }

  /**
   * Handle incoming sync messages
   */
  private handleSyncMessage(message: SyncMessage): void {
    // Validate message
    SyncMessageSchemaV1.parse(message);

    switch (message.type) {
      case 'TASK_CREATED':
        this.tasksSignal.update((tasks) => {
          // Avoid duplicates
          if (tasks.some((t) => t.id === message.payload.id)) {
            return tasks;
          }
          return [...tasks, message.payload];
        });
        break;

      case 'TASK_UPDATED':
        this.tasksSignal.update((tasks) =>
          tasks.map((t) =>
            t.id === message.payload.id ? message.payload : t
          )
        );
        break;

      case 'TASK_DELETED':
        this.tasksSignal.update((tasks) =>
          tasks.filter((t) => t.id !== message.payload.id)
        );
        break;

      case 'VOTE_REVEAL':
        this.tasksSignal.update((tasks) =>
          tasks.map((t) => {
            if (t.id === message.payload.taskId) {
              // Add userId to votedBy if not already present
              if (!t.votedBy.includes(message.payload.userId)) {
                return {
                  ...t,
                  votedBy: [...t.votedBy, message.payload.userId],
                };
              }
            }
            return t;
          })
        );
        break;
    }
  }
}
