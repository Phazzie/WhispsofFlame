import { Injectable } from '@angular/core';
import { NavigationPort } from '../ports/navigation.port';
import { AuthProviderPort } from '../ports/auth-provider.port';
import { ValidationError } from '../errors/validation.error';
import { generateSessionCode, validateSessionCode } from '../../shared/utils/session-code.util';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  constructor(
    private navigation: NavigationPort,
    private authProvider: AuthProviderPort
  ) {}

  /**
   * Create a new session with a randomly generated code
   * @returns Promise that resolves to the generated session code
   */
  async createSession(): Promise<string> {
    const code = generateSessionCode();
    await this.navigation.navigate(['/s', code]);
    return code;
  }

  /**
   * Join an existing session using a session code
   * @param code - The 6-character session code
   * @throws {ValidationError} if the code format is invalid
   */
  async joinSession(code: string): Promise<void> {
    // Validate code format
    if (!validateSessionCode(code)) {
      throw new ValidationError('Invalid session code format. Expected 6 uppercase alphanumeric characters.', [
        { field: 'code', value: code, constraint: 'Must be 6 uppercase alphanumeric characters' }
      ]);
    }

    // Check if user is authenticated
    const currentUser = await this.authProvider.currentUser();

    // If not authenticated, sign in as guest
    if (!currentUser) {
      await this.authProvider.signIn();
    }

    // Navigate to session
    await this.navigation.navigate(['/s', code]);
  }

  /**
   * Get the current session ID from the route
   * @returns The current session code or null if not in a session
   */
  getCurrentSessionId(): string | null {
    const urlSegments = this.navigation.getCurrentUrl().split('/');

    // Check if URL matches /s/{code} pattern
    if (urlSegments.length >= 3 && urlSegments[1] === 's') {
      const code = urlSegments[2].split('?')[0]; // Remove query params if any
      return validateSessionCode(code) ? code : null;
    }

    return null;
  }
}
