import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { TaskService } from './task.service';
import { TaskStorePort } from '../ports/task-store.port';
import { SyncBusPort } from '../ports/sync-bus.port';
import { AuthProviderPort } from '../ports/auth-provider.port';
import { Task } from '../models/task.contract';
import { SyncMessage } from '../models/sync-message.contract';
import { User } from '../models/user.contract';

describe('TaskService', () => {
  let service: TaskService;
  let taskStore: jasmine.SpyObj<TaskStorePort>;
  let syncBus: jasmine.SpyObj<SyncBusPort>;
  let authProvider: jasmine.SpyObj<AuthProviderPort>;
  let syncSubject: Subject<SyncMessage>;

  const mockUser: User = {
    id: '00000000-0000-0000-0000-000000000001',
    displayName: 'Test User',
    avatar: 'elephant',
    createdAt: '2025-01-01T00:00:00.000Z',
    isGuest: true,
  };

  const mockTask: Task = {
    id: '00000000-0000-0000-0000-000000000010',
    sessionId: 'ABC123',
    content: 'Test task',
    isSecret: false,
    votedBy: [],
    status: 'active',
    createdBy: mockUser.id,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    version: 1,
  };

  beforeEach(() => {
    syncSubject = new Subject<SyncMessage>();

    taskStore = jasmine.createSpyObj<TaskStorePort>('TaskStorePort', [
      'listBySession',
      'save',
      'delete',
      'watch',
      'clear',
    ]);

    syncBus = jasmine.createSpyObj<SyncBusPort>('SyncBusPort', [
      'connect',
      'disconnect',
      'publish',
      'subscribe',
      'status',
    ]);

    authProvider = jasmine.createSpyObj<AuthProviderPort>('AuthProviderPort', [
      'currentUser',
      'signIn',
      'signOut',
      'onChange',
    ]);

    // Setup default spy behaviors
    syncBus.subscribe.and.returnValue(syncSubject.asObservable());
    authProvider.currentUser.and.returnValue(Promise.resolve(mockUser));

    TestBed.configureTestingModule({
      providers: [
        TaskService,
        { provide: TaskStorePort, useValue: taskStore },
        { provide: SyncBusPort, useValue: syncBus },
        { provide: AuthProviderPort, useValue: authProvider },
      ],
    });

    service = TestBed.inject(TaskService);
  });

  afterEach(() => {
    syncSubject.complete();
  });

  describe('initialization', () => {
    it('should create the service', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with empty tasks', () => {
      expect(service.tasks()).toEqual([]);
      expect(service.activeTasks()).toEqual([]);
      expect(service.secretTasks()).toEqual([]);
    });
  });

  describe('joinSession', () => {
    it('should connect to sync bus and load tasks', async () => {
      const tasks: Task[] = [mockTask];
      taskStore.listBySession.and.returnValue(Promise.resolve(tasks));
      syncBus.connect.and.returnValue(Promise.resolve());

      await service.joinSession('ABC123');

      expect(authProvider.currentUser).toHaveBeenCalled();
      expect(syncBus.connect).toHaveBeenCalledWith('ABC123', mockUser.id);
      expect(taskStore.listBySession).toHaveBeenCalledWith('ABC123');
      expect(service.tasks()).toEqual(tasks);
      expect(syncBus.subscribe).toHaveBeenCalled();
    });

    it('should throw if user not authenticated', async () => {
      authProvider.currentUser.and.returnValue(Promise.resolve(null));

      await expectAsync(service.joinSession('ABC123')).toBeRejectedWithError(
        'User not authenticated'
      );
    });

    it('should validate loaded tasks', async () => {
      const invalidTask = { ...mockTask, id: 'invalid-uuid' };
      taskStore.listBySession.and.returnValue(Promise.resolve([invalidTask]));
      syncBus.connect.and.returnValue(Promise.resolve());

      await expectAsync(service.joinSession('ABC123')).toBeRejected();
    });
  });

  describe('createTask', () => {
    beforeEach(async () => {
      taskStore.listBySession.and.returnValue(Promise.resolve([]));
      syncBus.connect.and.returnValue(Promise.resolve());
      await service.joinSession('ABC123');
    });

    it('should create and save a task', async () => {
      const savedTask: Task = { ...mockTask, content: 'New task' };
      taskStore.save.and.returnValue(Promise.resolve(savedTask));
      syncBus.publish.and.returnValue(Promise.resolve());

      const result = await service.createTask('New task', false);

      expect(taskStore.save).toHaveBeenCalled();
      expect(syncBus.publish).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: 'TASK_CREATED',
          payload: savedTask,
          userId: mockUser.id,
        })
      );
      expect(service.tasks()).toContain(savedTask);
      expect(result).toEqual(savedTask);
    });

    it('should create a secret task', async () => {
      const secretTask: Task = { ...mockTask, isSecret: true };
      taskStore.save.and.returnValue(Promise.resolve(secretTask));
      syncBus.publish.and.returnValue(Promise.resolve());

      const result = await service.createTask('Secret task', true);

      expect(result.isSecret).toBe(true);
      expect(service.secretTasks()).toContain(secretTask);
    });

    it('should throw if user not authenticated', async () => {
      authProvider.currentUser.and.returnValue(Promise.resolve(null));

      await expectAsync(service.createTask('Task', false)).toBeRejectedWithError(
        'User not authenticated'
      );
    });

    it('should throw if no active session', async () => {
      await service.leaveSession();

      await expectAsync(service.createTask('Task', false)).toBeRejectedWithError(
        'No active session'
      );
    });

    it('should generate UUID and timestamps', async () => {
      taskStore.save.and.callFake((task: Task) => Promise.resolve(task));
      syncBus.publish.and.returnValue(Promise.resolve());

      await service.createTask('Task', false);

      const saveCall = taskStore.save.calls.mostRecent();
      const savedTask = saveCall.args[0] as Task;

      expect(savedTask.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(savedTask.createdAt).toBeTruthy();
      expect(savedTask.updatedAt).toBeTruthy();
      expect(savedTask.createdBy).toBe(mockUser.id);
      expect(savedTask.version).toBe(1);
    });
  });

  describe('updateTask', () => {
    beforeEach(async () => {
      taskStore.listBySession.and.returnValue(Promise.resolve([mockTask]));
      syncBus.connect.and.returnValue(Promise.resolve());
      await service.joinSession('ABC123');
    });

    it('should update a task', async () => {
      const updatedTask: Task = { ...mockTask, content: 'Updated', version: 2 };
      taskStore.save.and.returnValue(Promise.resolve(updatedTask));
      syncBus.publish.and.returnValue(Promise.resolve());

      const result = await service.updateTask(mockTask);

      expect(taskStore.save).toHaveBeenCalled();
      expect(syncBus.publish).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: 'TASK_UPDATED',
          payload: updatedTask,
          userId: mockUser.id,
        })
      );
      expect(service.tasks()[0]).toEqual(updatedTask);
      expect(result.version).toBe(2);
    });

    it('should increment version number', async () => {
      taskStore.save.and.callFake((task: Task) => Promise.resolve(task));
      syncBus.publish.and.returnValue(Promise.resolve());

      const result = await service.updateTask(mockTask);

      expect(result.version).toBe(mockTask.version + 1);
    });

    it('should update timestamp', async () => {
      taskStore.save.and.callFake((task: Task) => Promise.resolve(task));
      syncBus.publish.and.returnValue(Promise.resolve());

      const result = await service.updateTask(mockTask);

      expect(result.updatedAt).not.toBe(mockTask.updatedAt);
    });

    it('should throw if user not authenticated', async () => {
      authProvider.currentUser.and.returnValue(Promise.resolve(null));

      await expectAsync(
        service.updateTask(mockTask)
      ).toBeRejectedWithError('User not authenticated');
    });
  });

  describe('deleteTask', () => {
    beforeEach(async () => {
      taskStore.listBySession.and.returnValue(Promise.resolve([mockTask]));
      syncBus.connect.and.returnValue(Promise.resolve());
      await service.joinSession('ABC123');
    });

    it('should delete a task', async () => {
      taskStore.delete.and.returnValue(Promise.resolve());
      syncBus.publish.and.returnValue(Promise.resolve());

      await service.deleteTask(mockTask.id);

      expect(taskStore.delete).toHaveBeenCalledWith(mockTask.id);
      expect(syncBus.publish).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: 'TASK_DELETED',
          payload: { id: mockTask.id },
          userId: mockUser.id,
        })
      );
      expect(service.tasks()).not.toContain(mockTask);
    });

    it('should throw if user not authenticated', async () => {
      authProvider.currentUser.and.returnValue(Promise.resolve(null));

      await expectAsync(
        service.deleteTask(mockTask.id)
      ).toBeRejectedWithError('User not authenticated');
    });
  });

  describe('voteReveal', () => {
    const secretTask: Task = { ...mockTask, isSecret: true };

    beforeEach(async () => {
      taskStore.listBySession.and.returnValue(Promise.resolve([secretTask]));
      syncBus.connect.and.returnValue(Promise.resolve());
      await service.joinSession('ABC123');
    });

    it('should add vote to reveal a secret task', async () => {
      taskStore.save.and.callFake((task: Task) => Promise.resolve(task));
      syncBus.publish.and.returnValue(Promise.resolve());

      await service.voteReveal(secretTask.id);

      const saveCall = taskStore.save.calls.mostRecent();
      const savedTask = saveCall.args[0] as Task;

      expect(savedTask.votedBy).toContain(mockUser.id);
      expect(syncBus.publish).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: 'VOTE_REVEAL',
          payload: {
            taskId: secretTask.id,
            userId: mockUser.id,
          },
          userId: mockUser.id,
        })
      );
    });

    it('should not add duplicate votes', async () => {
      const votedTask: Task = { ...secretTask, votedBy: [mockUser.id] };
      taskStore.listBySession.and.returnValue(Promise.resolve([votedTask]));
      await service.leaveSession();
      await service.joinSession('ABC123');

      await service.voteReveal(secretTask.id);

      expect(taskStore.save).not.toHaveBeenCalled();
    });

    it('should throw if task not found', async () => {
      await expectAsync(
        service.voteReveal('nonexistent-id')
      ).toBeRejectedWithError(/Task not found/);
    });

    it('should throw if user not authenticated', async () => {
      authProvider.currentUser.and.returnValue(Promise.resolve(null));

      await expectAsync(
        service.voteReveal(secretTask.id)
      ).toBeRejectedWithError('User not authenticated');
    });
  });

  describe('leaveSession', () => {
    beforeEach(async () => {
      taskStore.listBySession.and.returnValue(Promise.resolve([mockTask]));
      syncBus.connect.and.returnValue(Promise.resolve());
      syncBus.disconnect.and.returnValue(Promise.resolve());
      await service.joinSession('ABC123');
    });

    it('should disconnect and clear tasks', async () => {
      expect(service.tasks().length).toBe(1);

      await service.leaveSession();

      expect(syncBus.disconnect).toHaveBeenCalled();
      expect(service.tasks()).toEqual([]);
    });
  });

  describe('sync message handling', () => {
    beforeEach(async () => {
      taskStore.listBySession.and.returnValue(Promise.resolve([]));
      syncBus.connect.and.returnValue(Promise.resolve());
      await service.joinSession('ABC123');
    });

    it('should handle TASK_CREATED message', async () => {
      const message: SyncMessage = {
        type: 'TASK_CREATED',
        payload: mockTask,
        timestamp: '2025-01-01T00:00:00.000Z',
        userId: 'other-user-id',
      };

      syncSubject.next(message);

      expect(service.tasks()).toContain(mockTask);
    });

    it('should not add duplicate tasks on TASK_CREATED', async () => {
      taskStore.listBySession.and.returnValue(Promise.resolve([mockTask]));
      await service.leaveSession();
      await service.joinSession('ABC123');

      const message: SyncMessage = {
        type: 'TASK_CREATED',
        payload: mockTask,
        timestamp: '2025-01-01T00:00:00.000Z',
        userId: 'other-user-id',
      };

      syncSubject.next(message);

      expect(service.tasks().length).toBe(1);
    });

    it('should handle TASK_UPDATED message', async () => {
      taskStore.listBySession.and.returnValue(Promise.resolve([mockTask]));
      await service.leaveSession();
      await service.joinSession('ABC123');

      const updatedTask: Task = { ...mockTask, content: 'Updated via sync' };
      const message: SyncMessage = {
        type: 'TASK_UPDATED',
        payload: updatedTask,
        timestamp: '2025-01-01T00:00:00.000Z',
        userId: 'other-user-id',
      };

      syncSubject.next(message);

      expect(service.tasks()[0].content).toBe('Updated via sync');
    });

    it('should handle TASK_DELETED message', async () => {
      taskStore.listBySession.and.returnValue(Promise.resolve([mockTask]));
      await service.leaveSession();
      await service.joinSession('ABC123');

      const message: SyncMessage = {
        type: 'TASK_DELETED',
        payload: { id: mockTask.id },
        timestamp: '2025-01-01T00:00:00.000Z',
        userId: 'other-user-id',
      };

      syncSubject.next(message);

      expect(service.tasks()).not.toContain(mockTask);
    });

    it('should handle VOTE_REVEAL message', async () => {
      const secretTask: Task = { ...mockTask, isSecret: true, votedBy: [] };
      taskStore.listBySession.and.returnValue(Promise.resolve([secretTask]));
      await service.leaveSession();
      await service.joinSession('ABC123');

      const message: SyncMessage = {
        type: 'VOTE_REVEAL',
        payload: {
          taskId: secretTask.id,
          userId: 'other-user-id',
        },
        timestamp: '2025-01-01T00:00:00.000Z',
        userId: 'other-user-id',
      };

      syncSubject.next(message);

      expect(service.tasks()[0].votedBy).toContain('other-user-id');
    });

    it('should not add duplicate votes from VOTE_REVEAL', async () => {
      const secretTask: Task = {
        ...mockTask,
        isSecret: true,
        votedBy: ['other-user-id'],
      };
      taskStore.listBySession.and.returnValue(Promise.resolve([secretTask]));
      await service.leaveSession();
      await service.joinSession('ABC123');

      const message: SyncMessage = {
        type: 'VOTE_REVEAL',
        payload: {
          taskId: secretTask.id,
          userId: 'other-user-id',
        },
        timestamp: '2025-01-01T00:00:00.000Z',
        userId: 'other-user-id',
      };

      syncSubject.next(message);

      expect(service.tasks()[0].votedBy.length).toBe(1);
    });
  });

  describe('computed signals', () => {
    beforeEach(async () => {
      const tasks: Task[] = [
        { ...mockTask, id: 'task-1', status: 'active' },
        { ...mockTask, id: 'task-2', status: 'done' },
        { ...mockTask, id: 'task-3', status: 'active', isSecret: true },
        {
          ...mockTask,
          id: 'task-4',
          status: 'active',
          isSecret: true,
          votedBy: ['user1', 'user2'],
        },
      ];
      taskStore.listBySession.and.returnValue(Promise.resolve(tasks));
      syncBus.connect.and.returnValue(Promise.resolve());
      await service.joinSession('ABC123');
    });

    it('should filter active tasks', () => {
      expect(service.activeTasks().length).toBe(3);
      expect(service.activeTasks().every((t) => t.status === 'active')).toBe(
        true
      );
    });

    it('should filter secret unrevealed tasks', () => {
      const secretTasks = service.secretTasks();
      expect(secretTasks.length).toBe(1);
      expect(secretTasks[0].id).toBe('task-3');
      expect(secretTasks.every((t) => t.isSecret)).toBe(true);
    });

    it('should update computed signals when tasks change', async () => {
      const newTask: Task = { ...mockTask, id: 'task-5', status: 'active' };
      taskStore.save.and.returnValue(Promise.resolve(newTask));
      syncBus.publish.and.returnValue(Promise.resolve());

      await service.createTask('New task', false);

      expect(service.activeTasks().length).toBe(4);
    });
  });

  describe('validation', () => {
    beforeEach(async () => {
      taskStore.listBySession.and.returnValue(Promise.resolve([]));
      syncBus.connect.and.returnValue(Promise.resolve());
      await service.joinSession('ABC123');
    });

    it('should validate tasks before creating', async () => {
      taskStore.save.and.callFake((task: Task) => {
        // Return invalid task (missing required fields)
        return Promise.resolve({ ...task, id: 'invalid' } as any);
      });
      syncBus.publish.and.returnValue(Promise.resolve());

      await expectAsync(service.createTask('Task', false)).toBeRejected();
    });

    it('should validate sync messages before publishing', async () => {
      taskStore.save.and.returnValue(Promise.resolve(mockTask));
      syncBus.publish.and.callFake((message: SyncMessage) => {
        // Verify message is valid before publish
        expect(message.type).toBe('TASK_CREATED');
        expect(message.payload).toBeTruthy();
        expect(message.timestamp).toBeTruthy();
        expect(message.userId).toBeTruthy();
        return Promise.resolve();
      });

      await service.createTask('Task', false);

      expect(syncBus.publish).toHaveBeenCalled();
    });
  });
});
