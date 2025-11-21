import { User } from '../../core/models/user.contract';

export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    displayName: 'Test User',
    avatar: 'elephant',
    createdAt: '2025-01-01T00:00:00.000Z',
    isGuest: true,
    ...overrides,
  };
}
