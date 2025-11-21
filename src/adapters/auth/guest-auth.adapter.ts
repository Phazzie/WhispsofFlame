import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthProviderPort } from '../../core/ports/auth-provider.port';
import { User, UserSchemaV1 } from '../../core/models/user.contract';
import { AuthError } from '../../core/errors/auth.error';
import { generateAnimalName } from '../../shared/utils/animal-name.util';

const STORAGE_KEY = 'whisps_guest_user';

@Injectable()
export class GuestAuthAdapter extends AuthProviderPort {
  private userSubject = new BehaviorSubject<User | null>(null);

  constructor() {
    super();
    this.loadUserFromStorage();
  }

  async currentUser(): Promise<User | null> {
    return this.userSubject.value;
  }

  async signIn(): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = this.userSubject.value;
      if (existingUser) {
        return existingUser;
      }

      // Generate new guest user
      const { displayName, avatar } = generateAnimalName();
      const user: User = {
        id: crypto.randomUUID(),
        displayName,
        avatar,
        createdAt: new Date().toISOString(),
        isGuest: true,
      };

      // Validate user
      const validatedUser = UserSchemaV1.parse(user);

      // Store in localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validatedUser));

      // Update subject
      this.userSubject.next(validatedUser);

      return validatedUser;
    } catch (error) {
      if (error instanceof Error) {
        throw new AuthError(`Failed to sign in: ${error.message}`);
      }
      throw new AuthError('Failed to sign in: Unknown error');
    }
  }

  async signOut(): Promise<void> {
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY);

    // Emit null via onChange()
    this.userSubject.next(null);
  }

  onChange(): Observable<User | null> {
    return this.userSubject.asObservable();
  }

  private loadUserFromStorage(): void {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEY);
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const validatedUser = UserSchemaV1.parse(user);
        this.userSubject.next(validatedUser);
      }
    } catch (error) {
      // If validation fails, clear invalid data
      localStorage.removeItem(STORAGE_KEY);
      this.userSubject.next(null);
    }
  }
}
