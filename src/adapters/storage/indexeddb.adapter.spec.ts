import { IndexedDbAdapter } from './indexeddb.adapter';
import { Task } from '../../core/models/task.contract';
import { StorageError, ConflictError } from '../../core/errors';
import { ErrorReporterPort } from '../../core/ports/error-reporter.port';
import { firstValueFrom } from 'rxjs';

// Mock IndexedDB implementation for testing
class MockIndexedDB {
  private databases: Map<string, Map<string, any>> = new Map();

  open(dbName: string, version: number, config?: any): Promise<any> {
    if (!this.databases.has(dbName)) {
      this.databases.set(dbName, new Map());
    }

    const db = this.databases.get(dbName)!;

    if (config && config.upgrade) {
      const mockDb = {
        objectStoreNames: {
          contains: (name: string) => db.has(name),
        },
        createObjectStore: (name: string, options: any) => {
          const store = new Map();
          db.set(name, store);
          return {
            createIndex: () => {},
          };
        },
      };
      config.upgrade(mockDb);
    }

    const mockDbInstance = {
      transaction: (storeName: string, mode: string) => {
        const store = db.get(storeName) || new Map();
        return {
          store: {
            get: async (key: string) => store.get(key),
            getAll: async () => Array.from(store.values()),
            put: async (value: any) => store.set(value.id, value),
            delete: async (key: string) => store.delete(key),
            clear: async () => store.clear(),
            index: (indexName: string) => ({
              getAll: async (key: string) => {
                return Array.from(store.values()).filter(
                  (item: any) => item.sessionId === key
                );
              },
            }),
          },
          done: Promise.resolve(),
        };
      },
    };

    return Promise.resolve(mockDbInstance);
  }

  clear() {
    this.databases.clear();
  }
}

// Install mock before tests
const mockIDB = new MockIndexedDB();
let originalOpenDB: any;

describe('IndexedDbAdapter', () => {
  let adapter: IndexedDbAdapter;
  let mockErrorReporter: jasmine.SpyObj<ErrorReporterPort>;

  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    id: '123e4567-e89b-12d3-a456-426614174000',
    sessionId: 'ABC123',
    content: 'Test task',
    isSecret: false,
    votedBy: [],
    status: 'active',
    createdBy: '123e4567-e89b-12d3-a456-426614174001',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    version: 1,
    ...overrides,
  });

  beforeAll(async () => {
    // Mock the openDB function from 'idb'
    const idbModule = await import('idb');
    originalOpenDB = idbModule.openDB;
    (idbModule as any).openDB = mockIDB.open.bind(mockIDB);
  });

  afterAll(() => {
    // Restore original openDB
    if (originalOpenDB) {
      const idbModule = require('idb');
      (idbModule as any).openDB = originalOpenDB;
    }
  });

  beforeEach(() => {
    mockErrorReporter = jasmine.createSpyObj<ErrorReporterPort>('ErrorReporterPort', [
      'captureException',
      'captureMessage',
    ]);

    adapter = new IndexedDbAdapter(mockErrorReporter);
    mockIDB.clear();
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      await adapter.clear();
    } catch (error) {
      // Ignore errors during cleanup
    }
  });

  describe('Contract Tests', () => {
    it('should implement all TaskStorePort methods', () => {
      expect(adapter.listBySession).toBeDefined();
      expect(adapter.save).toBeDefined();
      expect(adapter.delete).toBeDefined();
      expect(adapter.watch).toBeDefined();
      expect(adapter.clear).toBeDefined();
    });

    it('should have correct method signatures', () => {
      expect(typeof adapter.listBySession).toBe('function');
      expect(typeof adapter.save).toBe('function');
      expect(typeof adapter.delete).toBe('function');
      expect(typeof adapter.watch).toBe('function');
      expect(typeof adapter.clear).toBe('function');
    });
  });

  describe('save()', () => {
    it('should save a new task', async () => {
      const task = createMockTask();

      const savedTask = await adapter.save(task);

      expect(savedTask).toBeDefined();
      expect(savedTask.id).toBe(task.id);
      expect(savedTask.content).toBe(task.content);
      expect(savedTask.version).toBe(task.version);
    });

    it('should increment version on update', async () => {
      const task = createMockTask();

      const savedTask = await adapter.save(task);
      const updatedTask = await adapter.save({
        ...savedTask,
        content: 'Updated content',
      });

      expect(updatedTask.version).toBe(savedTask.version + 1);
      expect(updatedTask.content).toBe('Updated content');
    });

    it('should update updatedAt timestamp on save', async () => {
      const task = createMockTask({ updatedAt: '2025-01-01T00:00:00.000Z' });

      const savedTask = await adapter.save(task);

      // For new tasks, updatedAt should remain the same
      expect(savedTask.updatedAt).toBe(task.updatedAt);

      // For updates, updatedAt should change
      const beforeUpdate = new Date().toISOString();
      const updatedTask = await adapter.save({
        ...savedTask,
        content: 'Updated',
      });

      expect(new Date(updatedTask.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeUpdate).getTime()
      );
    });

    it('should throw ConflictError on version mismatch', async () => {
      const task = createMockTask();

      await adapter.save(task);

      // Try to save with wrong version
      const conflictingTask = { ...task, version: 999 };

      await expectAsync(adapter.save(conflictingTask)).toBeRejectedWithError(
        ConflictError,
        /Version mismatch/
      );
    });

    it('should throw StorageError on invalid task data', async () => {
      const invalidTask = {
        id: 'invalid-uuid',
        sessionId: 'INVALID',
        content: '',
      } as unknown as Task;

      await expectAsync(adapter.save(invalidTask)).toBeRejectedWithError(
        StorageError,
        /Invalid task data/
      );
      expect(mockErrorReporter.captureException).toHaveBeenCalled();
    });

    it('should validate task schema', async () => {
      const invalidTask = createMockTask({
        sessionId: 'invalid-session-id',
      });

      await expectAsync(adapter.save(invalidTask)).toBeRejectedWithError(
        StorageError
      );
    });
  });

  describe('listBySession()', () => {
    it('should return empty array for non-existent session', async () => {
      const tasks = await adapter.listBySession('XYZ789');

      expect(tasks).toEqual([]);
    });

    it('should retrieve tasks for a session', async () => {
      const task1 = createMockTask({ id: '123e4567-e89b-12d3-a456-426614174000' });
      const task2 = createMockTask({ id: '123e4567-e89b-12d3-a456-426614174001' });

      await adapter.save(task1);
      await adapter.save(task2);

      const tasks = await adapter.listBySession('ABC123');

      expect(tasks.length).toBe(2);
      expect(tasks.some((t) => t.id === task1.id)).toBe(true);
      expect(tasks.some((t) => t.id === task2.id)).toBe(true);
    });

    it('should only return tasks for the specified session', async () => {
      const task1 = createMockTask({
        id: '123e4567-e89b-12d3-a456-426614174000',
        sessionId: 'ABC123',
      });
      const task2 = createMockTask({
        id: '123e4567-e89b-12d3-a456-426614174001',
        sessionId: 'XYZ789',
      });

      await adapter.save(task1);
      await adapter.save(task2);

      const tasks = await adapter.listBySession('ABC123');

      expect(tasks.length).toBe(1);
      expect(tasks[0].id).toBe(task1.id);
    });

    it('should validate retrieved tasks', async () => {
      const task = createMockTask();
      await adapter.save(task);

      const tasks = await adapter.listBySession('ABC123');

      expect(tasks.length).toBe(1);
      expect(tasks[0].id).toBe(task.id);
      expect(tasks[0].sessionId).toBe(task.sessionId);
    });
  });

  describe('delete()', () => {
    it('should delete a task', async () => {
      const task = createMockTask();

      await adapter.save(task);
      await adapter.delete(task.id);

      const tasks = await adapter.listBySession('ABC123');
      expect(tasks.length).toBe(0);
    });

    it('should not throw error when deleting non-existent task', async () => {
      await expectAsync(
        adapter.delete('123e4567-e89b-12d3-a456-426614174999')
      ).toBeResolved();
    });

    it('should only delete specified task', async () => {
      const task1 = createMockTask({ id: '123e4567-e89b-12d3-a456-426614174000' });
      const task2 = createMockTask({ id: '123e4567-e89b-12d3-a456-426614174001' });

      await adapter.save(task1);
      await adapter.save(task2);
      await adapter.delete(task1.id);

      const tasks = await adapter.listBySession('ABC123');
      expect(tasks.length).toBe(1);
      expect(tasks[0].id).toBe(task2.id);
    });
  });

  describe('watch()', () => {
    it('should return an Observable', () => {
      const observable = adapter.watch('ABC123');

      expect(observable).toBeDefined();
      expect(typeof observable.subscribe).toBe('function');
    });

    it('should emit initial empty array for new session', async () => {
      const observable = adapter.watch('ABC123');
      const value = await firstValueFrom(observable);

      expect(value).toEqual([]);
    });

    it('should emit current tasks on subscription', async () => {
      const task = createMockTask();
      await adapter.save(task);

      const observable = adapter.watch('ABC123');
      const value = await firstValueFrom(observable);

      expect(value.length).toBe(1);
      expect(value[0].id).toBe(task.id);
    });

    it('should emit updates when tasks are saved', (done) => {
      const task = createMockTask();
      const observable = adapter.watch('ABC123');
      let emissionCount = 0;

      observable.subscribe((tasks) => {
        emissionCount++;

        if (emissionCount === 1) {
          // Initial emission (empty)
          expect(tasks.length).toBe(0);
          adapter.save(task);
        } else if (emissionCount === 2) {
          // After save
          expect(tasks.length).toBe(1);
          expect(tasks[0].id).toBe(task.id);
          done();
        }
      });
    });

    it('should emit updates when tasks are deleted', (done) => {
      const task = createMockTask();
      const observable = adapter.watch('ABC123');
      let emissionCount = 0;

      observable.subscribe((tasks) => {
        emissionCount++;

        if (emissionCount === 1) {
          // Initial emission (empty)
          adapter.save(task);
        } else if (emissionCount === 2) {
          // After save
          expect(tasks.length).toBe(1);
          adapter.delete(task.id);
        } else if (emissionCount === 3) {
          // After delete
          expect(tasks.length).toBe(0);
          done();
        }
      });
    });

    it('should support multiple watchers for same session', async () => {
      const task = createMockTask();
      await adapter.save(task);

      const observable1 = adapter.watch('ABC123');
      const observable2 = adapter.watch('ABC123');

      const value1 = await firstValueFrom(observable1);
      const value2 = await firstValueFrom(observable2);

      expect(value1).toEqual(value2);
      expect(value1.length).toBe(1);
    });

    it('should only emit updates for relevant session', (done) => {
      const task1 = createMockTask({
        id: '123e4567-e89b-12d3-a456-426614174000',
        sessionId: 'ABC123',
      });
      const task2 = createMockTask({
        id: '123e4567-e89b-12d3-a456-426614174001',
        sessionId: 'XYZ789',
      });

      const observable = adapter.watch('ABC123');
      let emissionCount = 0;

      observable.subscribe((tasks) => {
        emissionCount++;

        if (emissionCount === 1) {
          // Initial emission (empty)
          adapter.save(task2); // Save task for different session
          setTimeout(() => {
            adapter.save(task1); // Save task for watched session
          }, 50);
        } else if (emissionCount === 2) {
          // Should only emit for task1
          expect(tasks.length).toBe(1);
          expect(tasks[0].id).toBe(task1.id);
          done();
        }
      });
    });
  });

  describe('clear()', () => {
    it('should remove all tasks', async () => {
      const task1 = createMockTask({ id: '123e4567-e89b-12d3-a456-426614174000' });
      const task2 = createMockTask({
        id: '123e4567-e89b-12d3-a456-426614174001',
        sessionId: 'XYZ789',
      });

      await adapter.save(task1);
      await adapter.save(task2);
      await adapter.clear();

      const tasks1 = await adapter.listBySession('ABC123');
      const tasks2 = await adapter.listBySession('XYZ789');

      expect(tasks1.length).toBe(0);
      expect(tasks2.length).toBe(0);
    });

    it('should notify all watchers on clear', (done) => {
      const task = createMockTask();
      const observable = adapter.watch('ABC123');
      let emissionCount = 0;

      observable.subscribe((tasks) => {
        emissionCount++;

        if (emissionCount === 1) {
          // Initial emission (empty)
          adapter.save(task);
        } else if (emissionCount === 2) {
          // After save
          expect(tasks.length).toBe(1);
          adapter.clear();
        } else if (emissionCount === 3) {
          // After clear
          expect(tasks.length).toBe(0);
          done();
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should report errors to ErrorReporter', async () => {
      const invalidTask = {
        id: 'invalid',
        content: '',
      } as unknown as Task;

      try {
        await adapter.save(invalidTask);
      } catch (error) {
        // Expected to fail
      }

      expect(mockErrorReporter.captureException).toHaveBeenCalled();
    });

    it('should throw StorageError with descriptive message', async () => {
      const invalidTask = {} as Task;

      await expectAsync(adapter.save(invalidTask)).toBeRejectedWithError(
        StorageError
      );
    });
  });

  describe('Optimistic Concurrency', () => {
    it('should prevent concurrent updates with same version', async () => {
      const task = createMockTask();

      const savedTask = await adapter.save(task);

      // Simulate two concurrent updates with same version
      const update1 = { ...savedTask, content: 'Update 1' };
      const update2 = { ...savedTask, content: 'Update 2' };

      await adapter.save(update1);

      // Second update should fail because version is stale
      await expectAsync(adapter.save(update2)).toBeRejectedWithError(
        ConflictError
      );
    });

    it('should allow sequential updates', async () => {
      const task = createMockTask();

      const saved1 = await adapter.save(task);
      const saved2 = await adapter.save({ ...saved1, content: 'Update 1' });
      const saved3 = await adapter.save({ ...saved2, content: 'Update 2' });

      expect(saved1.version).toBe(1);
      expect(saved2.version).toBe(2);
      expect(saved3.version).toBe(3);
    });
  });
});
