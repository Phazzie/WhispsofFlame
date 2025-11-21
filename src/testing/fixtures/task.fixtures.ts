import { Task } from '../../core/models/task.contract';

export function createMockTask(overrides?: Partial<Task>): Task {
  return {
    id: '00000000-0000-0000-0000-000000000010',
    sessionId: 'ABC123',
    content: 'Test task',
    isSecret: false,
    votedBy: [],
    status: 'active',
    createdBy: '00000000-0000-0000-0000-000000000001',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    version: 1,
    ...overrides,
  };
}

export function createSecretTask(overrides?: Partial<Task>): Task {
  return createMockTask({ isSecret: true, ...overrides });
}

export function createRevealedTask(overrides?: Partial<Task>): Task {
  return createMockTask({
    isSecret: true,
    votedBy: ['user1', 'user2'],
    ...overrides
  });
}
