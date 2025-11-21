import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SessionService } from './session.service';
import { AuthProviderPort } from '../ports/auth-provider.port';
import { ValidationError } from '../errors/validation.error';
import { User } from '../models/user.contract';
import * as sessionCodeUtil from '../../shared/utils/session-code.util';

describe('SessionService', () => {
  let service: SessionService;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockAuthProvider: jasmine.SpyObj<AuthProviderPort>;

  const mockUser: User = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    displayName: 'Test User',
    avatar: 'elephant',
    createdAt: '2025-01-01T00:00:00Z',
    isGuest: false
  };

  const mockGuestUser: User = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    displayName: 'Anonymous Elephant',
    avatar: 'elephant',
    createdAt: '2025-01-01T00:00:00Z',
    isGuest: true
  };

  beforeEach(() => {
    // Create spies for Router
    mockRouter = jasmine.createSpyObj<Router>('Router', ['navigate'], {
      url: '/home'
    });
    mockRouter.navigate.and.returnValue(Promise.resolve(true));

    // Create spies for AuthProviderPort
    mockAuthProvider = jasmine.createSpyObj<AuthProviderPort>(
      'AuthProviderPort',
      ['currentUser', 'signIn', 'signOut', 'onChange']
    );

    TestBed.configureTestingModule({
      providers: [
        SessionService,
        { provide: Router, useValue: mockRouter },
        { provide: AuthProviderPort, useValue: mockAuthProvider }
      ]
    });

    service = TestBed.inject(SessionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createSession', () => {
    it('should generate a valid session code', async () => {
      const code = await service.createSession();
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('should navigate to /s/{code}', async () => {
      const code = await service.createSession();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/s', code]);
    });

    it('should return the generated code', async () => {
      spyOn(sessionCodeUtil, 'generateSessionCode').and.returnValue('ABC123');
      const code = await service.createSession();
      expect(code).toBe('ABC123');
    });

    it('should generate different codes on multiple calls', async () => {
      const codes = new Set<string>();
      for (let i = 0; i < 10; i++) {
        codes.add(await service.createSession());
      }
      expect(codes.size).toBeGreaterThan(8); // Expect mostly unique codes
    });

    it('should handle navigation failures gracefully', async () => {
      mockRouter.navigate.and.returnValue(Promise.resolve(false));
      const code = await service.createSession();
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
      expect(mockRouter.navigate).toHaveBeenCalled();
    });
  });

  describe('joinSession', () => {
    beforeEach(() => {
      mockAuthProvider.currentUser.and.returnValue(Promise.resolve(mockUser));
    });

    it('should validate the session code format', async () => {
      await expectAsync(service.joinSession('invalid')).toBeRejectedWithError(ValidationError);
    });

    it('should throw ValidationError for invalid code formats', async () => {
      const invalidCodes = ['abc', 'ABC12', 'ABC1234', 'abc123', 'ABC-12', ''];

      for (const code of invalidCodes) {
        try {
          await service.joinSession(code);
          fail(`Expected ValidationError for code: ${code}`);
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          expect((error as ValidationError).message).toContain('Invalid session code format');
        }
      }
    });

    it('should accept valid session codes', async () => {
      await service.joinSession('ABC123');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/s', 'ABC123']);
    });

    it('should navigate to /s/{code} for valid codes', async () => {
      await service.joinSession('XYZ789');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/s', 'XYZ789']);
    });

    it('should check if user is authenticated before joining', async () => {
      await service.joinSession('ABC123');
      expect(mockAuthProvider.currentUser).toHaveBeenCalled();
    });

    it('should not sign in if user is already authenticated', async () => {
      mockAuthProvider.currentUser.and.returnValue(Promise.resolve(mockUser));
      await service.joinSession('ABC123');
      expect(mockAuthProvider.signIn).not.toHaveBeenCalled();
    });

    it('should sign in as guest if user is not authenticated', async () => {
      mockAuthProvider.currentUser.and.returnValue(Promise.resolve(null));
      mockAuthProvider.signIn.and.returnValue(Promise.resolve(mockGuestUser));

      await service.joinSession('ABC123');

      expect(mockAuthProvider.signIn).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/s', 'ABC123']);
    });

    it('should handle guest user creation and navigation', async () => {
      mockAuthProvider.currentUser.and.returnValue(Promise.resolve(null));
      mockAuthProvider.signIn.and.returnValue(Promise.resolve(mockGuestUser));

      await service.joinSession('GHI456');

      expect(mockAuthProvider.currentUser).toHaveBeenCalled();
      expect(mockAuthProvider.signIn).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/s', 'GHI456']);
    });

    it('should validate code before checking authentication', async () => {
      mockAuthProvider.currentUser.and.returnValue(Promise.resolve(null));

      await expectAsync(service.joinSession('bad')).toBeRejectedWithError(ValidationError);

      // Should not proceed to authentication if code is invalid
      expect(mockAuthProvider.currentUser).not.toHaveBeenCalled();
      expect(mockAuthProvider.signIn).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should include validation details in error', async () => {
      try {
        await service.joinSession('bad');
        fail('Expected ValidationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.issues).toBeDefined();
        expect(validationError.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getCurrentSessionId', () => {
    it('should return null when not in a session route', () => {
      Object.defineProperty(mockRouter, 'url', { value: '/home', writable: true });
      expect(service.getCurrentSessionId()).toBeNull();
    });

    it('should return null for root path', () => {
      Object.defineProperty(mockRouter, 'url', { value: '/', writable: true });
      expect(service.getCurrentSessionId()).toBeNull();
    });

    it('should extract session code from /s/{code} route', () => {
      Object.defineProperty(mockRouter, 'url', { value: '/s/ABC123', writable: true });
      expect(service.getCurrentSessionId()).toBe('ABC123');
    });

    it('should handle different valid session codes', () => {
      const validCodes = ['ABC123', 'XYZ789', 'A1B2C3', '123456', 'ZZZZZZ'];

      for (const code of validCodes) {
        Object.defineProperty(mockRouter, 'url', { value: `/s/${code}`, writable: true });
        expect(service.getCurrentSessionId()).toBe(code);
      }
    });

    it('should return null for invalid session code format in URL', () => {
      Object.defineProperty(mockRouter, 'url', { value: '/s/invalid', writable: true });
      expect(service.getCurrentSessionId()).toBeNull();
    });

    it('should return null for lowercase session codes', () => {
      Object.defineProperty(mockRouter, 'url', { value: '/s/abc123', writable: true });
      expect(service.getCurrentSessionId()).toBeNull();
    });

    it('should handle query parameters in URL', () => {
      Object.defineProperty(mockRouter, 'url', { value: '/s/ABC123?tab=chat', writable: true });
      expect(service.getCurrentSessionId()).toBe('ABC123');
    });

    it('should handle URL fragments', () => {
      Object.defineProperty(mockRouter, 'url', { value: '/s/ABC123#section', writable: true });
      expect(service.getCurrentSessionId()).toBe('ABC123');
    });

    it('should handle complex URLs with query params and fragments', () => {
      Object.defineProperty(mockRouter, 'url', { value: '/s/ABC123?tab=chat&mode=edit#top', writable: true });
      expect(service.getCurrentSessionId()).toBe('ABC123');
    });

    it('should return null for non-session routes starting with /s', () => {
      Object.defineProperty(mockRouter, 'url', { value: '/settings', writable: true });
      expect(service.getCurrentSessionId()).toBeNull();
    });

    it('should return null for /s without a code', () => {
      Object.defineProperty(mockRouter, 'url', { value: '/s', writable: true });
      expect(service.getCurrentSessionId()).toBeNull();
    });

    it('should return null for /s/', () => {
      Object.defineProperty(mockRouter, 'url', { value: '/s/', writable: true });
      expect(service.getCurrentSessionId()).toBeNull();
    });

    it('should handle nested routes under session', () => {
      Object.defineProperty(mockRouter, 'url', { value: '/s/ABC123/chat', writable: true });
      expect(service.getCurrentSessionId()).toBe('ABC123');
    });
  });

  describe('Integration scenarios', () => {
    it('should support full create and join workflow', async () => {
      // Create session
      const code = await service.createSession();
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/s', code]);

      // Simulate navigation to session route
      Object.defineProperty(mockRouter, 'url', { value: `/s/${code}`, writable: true });

      // Verify we can get the current session ID
      expect(service.getCurrentSessionId()).toBe(code);

      // Another user joins the same session
      mockAuthProvider.currentUser.and.returnValue(Promise.resolve(null));
      mockAuthProvider.signIn.and.returnValue(Promise.resolve(mockGuestUser));

      await service.joinSession(code);
      expect(mockAuthProvider.signIn).toHaveBeenCalled();
    });

    it('should handle multiple sequential session operations', async () => {
      mockAuthProvider.currentUser.and.returnValue(Promise.resolve(mockUser));

      const code1 = await service.createSession();
      await service.joinSession('ABC123');
      const code2 = await service.createSession();

      expect(mockRouter.navigate).toHaveBeenCalledTimes(3);
      expect(code1).not.toBe(code2);
    });
  });
});
