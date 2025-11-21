import { GuestAuthAdapter } from './guest-auth.adapter';
import { AuthError } from '../../core/errors/auth.error';
import { firstValueFrom } from 'rxjs';

describe('GuestAuthAdapter', () => {
  let adapter: GuestAuthAdapter;
  const STORAGE_KEY = 'whisps_guest_user';

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    adapter = new GuestAuthAdapter();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Contract Tests - AuthProviderPort', () => {
    it('should implement currentUser method', async () => {
      expect(adapter.currentUser).toBeDefined();
      const user = await adapter.currentUser();
      expect(user).toBeNull();
    });

    it('should implement signIn method', async () => {
      expect(adapter.signIn).toBeDefined();
      const user = await adapter.signIn();
      expect(user).toBeDefined();
    });

    it('should implement signOut method', async () => {
      expect(adapter.signOut).toBeDefined();
      await adapter.signOut();
      expect(true).toBe(true); // signOut returns void
    });

    it('should implement onChange method', () => {
      expect(adapter.onChange).toBeDefined();
      const observable = adapter.onChange();
      expect(observable.subscribe).toBeDefined();
    });
  });

  describe('currentUser()', () => {
    it('should return null when no user is signed in', async () => {
      const user = await adapter.currentUser();
      expect(user).toBeNull();
    });

    it('should return current user after sign in', async () => {
      await adapter.signIn();
      const user = await adapter.currentUser();
      expect(user).not.toBeNull();
      expect(user?.id).toBeTruthy();
    });
  });

  describe('signIn()', () => {
    it('should create a new guest user on first sign in', async () => {
      const user = await adapter.signIn();

      expect(user).toBeDefined();
      expect(user.id).toBeTruthy();
      expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(user.displayName).toBeTruthy();
      expect(user.displayName).toMatch(/^\w+ \w+$/);
      expect(['elephant', 'dolphin', 'fox', 'owl', 'bear', 'wolf']).toContain(user.avatar);
      expect(user.createdAt).toBeTruthy();
      expect(user.isGuest).toBe(true);
    });

    it('should store user in localStorage', async () => {
      const user = await adapter.signIn();
      const stored = localStorage.getItem(STORAGE_KEY);

      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.id).toBe(user.id);
      expect(parsed.displayName).toBe(user.displayName);
    });

    it('should return the same user on subsequent sign in calls', async () => {
      const user1 = await adapter.signIn();
      const user2 = await adapter.signIn();

      expect(user2.id).toBe(user1.id);
      expect(user2.displayName).toBe(user1.displayName);
      expect(user2.avatar).toBe(user1.avatar);
      expect(user2.createdAt).toBe(user1.createdAt);
    });

    it('should load existing user from localStorage on initialization', async () => {
      // Sign in and get user
      const user1 = await adapter.signIn();

      // Create new adapter instance (simulates page reload)
      const newAdapter = new GuestAuthAdapter();
      const user2 = await newAdapter.currentUser();

      expect(user2).not.toBeNull();
      expect(user2?.id).toBe(user1.id);
      expect(user2?.displayName).toBe(user1.displayName);
    });

    it('should validate user with UserSchemaV1', async () => {
      const user = await adapter.signIn();

      // All these properties should exist and be valid
      expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(user.displayName.length).toBeGreaterThan(0);
      expect(user.displayName.length).toBeLessThanOrEqual(50);
      expect(['elephant', 'dolphin', 'fox', 'owl', 'bear', 'wolf']).toContain(user.avatar);
      expect(() => new Date(user.createdAt)).not.toThrow();
      expect(typeof user.isGuest).toBe('boolean');
    });
  });

  describe('signOut()', () => {
    it('should clear user from localStorage', async () => {
      await adapter.signIn();
      expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy();

      await adapter.signOut();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('should set current user to null', async () => {
      await adapter.signIn();
      const userBefore = await adapter.currentUser();
      expect(userBefore).not.toBeNull();

      await adapter.signOut();
      const userAfter = await adapter.currentUser();
      expect(userAfter).toBeNull();
    });

    it('should work even when no user is signed in', async () => {
      await expectAsync(adapter.signOut()).toBeResolved();
      const user = await adapter.currentUser();
      expect(user).toBeNull();
    });
  });

  describe('onChange()', () => {
    it('should emit null initially when no user exists', async () => {
      const observable = adapter.onChange();
      const value = await firstValueFrom(observable);
      expect(value).toBeNull();
    });

    it('should emit user after sign in', (done) => {
      const observable = adapter.onChange();
      let emissionCount = 0;

      observable.subscribe((user) => {
        emissionCount++;
        if (emissionCount === 1) {
          // First emission: null (initial value)
          expect(user).toBeNull();
        } else if (emissionCount === 2) {
          // Second emission: user after sign in
          expect(user).not.toBeNull();
          expect(user?.id).toBeTruthy();
          done();
        }
      });

      adapter.signIn();
    });

    it('should emit null after sign out', (done) => {
      const observable = adapter.onChange();
      let emissionCount = 0;

      observable.subscribe((user) => {
        emissionCount++;
        if (emissionCount === 1) {
          // First emission: null (initial value)
          expect(user).toBeNull();
          adapter.signIn();
        } else if (emissionCount === 2) {
          // Second emission: user after sign in
          expect(user).not.toBeNull();
          adapter.signOut();
        } else if (emissionCount === 3) {
          // Third emission: null after sign out
          expect(user).toBeNull();
          done();
        }
      });
    });

    it('should not emit duplicate values for same user', (done) => {
      const observable = adapter.onChange();
      let emissionCount = 0;

      observable.subscribe(() => {
        emissionCount++;
      });

      adapter.signIn().then(() => {
        adapter.signIn().then(() => {
          // Should only have 2 emissions: initial null + sign in user
          // Second signIn should not emit because it's the same user
          expect(emissionCount).toBe(2);
          done();
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid data in localStorage gracefully', async () => {
      // Put invalid data in localStorage
      localStorage.setItem(STORAGE_KEY, 'invalid json');

      // Create new adapter (should handle invalid data)
      const newAdapter = new GuestAuthAdapter();
      const user = await newAdapter.currentUser();

      expect(user).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull(); // Should clear invalid data
    });

    it('should handle localStorage with invalid user schema', async () => {
      // Put data that doesn't match UserSchemaV1
      const invalidUser = {
        id: 'not-a-uuid',
        displayName: '',
        avatar: 'invalid-avatar',
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(invalidUser));

      // Create new adapter (should handle invalid schema)
      const newAdapter = new GuestAuthAdapter();
      const user = await newAdapter.currentUser();

      expect(user).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull(); // Should clear invalid data
    });
  });

  describe('Integration Tests', () => {
    it('should maintain user state across multiple operations', async () => {
      // Sign in
      const user1 = await adapter.signIn();
      expect(user1).toBeTruthy();

      // Get current user
      const user2 = await adapter.currentUser();
      expect(user2?.id).toBe(user1.id);

      // Sign in again (should be same user)
      const user3 = await adapter.signIn();
      expect(user3.id).toBe(user1.id);

      // Sign out
      await adapter.signOut();
      const user4 = await adapter.currentUser();
      expect(user4).toBeNull();

      // Sign in again (should create new user)
      const user5 = await adapter.signIn();
      expect(user5.id).not.toBe(user1.id);
    });

    it('should persist across adapter instances', async () => {
      // First adapter
      const adapter1 = new GuestAuthAdapter();
      const user1 = await adapter1.signIn();

      // Second adapter (simulates page reload)
      const adapter2 = new GuestAuthAdapter();
      const user2 = await adapter2.currentUser();

      expect(user2?.id).toBe(user1.id);

      // Sign out from second adapter
      await adapter2.signOut();

      // Third adapter
      const adapter3 = new GuestAuthAdapter();
      const user3 = await adapter3.currentUser();

      expect(user3).toBeNull();
    });
  });
});
