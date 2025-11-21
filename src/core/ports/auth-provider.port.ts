import { Observable } from 'rxjs';
import { User } from '../models/user.contract';

export abstract class AuthProviderPort {
  /**
   * Get current authenticated user (null if none)
   */
  abstract currentUser(): Promise<User | null>;

  /**
   * Sign in (for guest: auto-creates UUID + animal name)
   * @throws {AuthError} if sign-in fails
   */
  abstract signIn(): Promise<User>;

  /**
   * Sign out current user
   */
  abstract signOut(): Promise<void>;

  /**
   * Watch for auth state changes
   */
  abstract onChange(): Observable<User | null>;
}
