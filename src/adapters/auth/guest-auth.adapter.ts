import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthProviderPort } from '../../core/ports/auth-provider.port';
import { User, UserSchemaV1 } from '../../core/models/user.contract';
import { AuthError } from '../../core/errors/auth.error';
import { generateAnimalName } from '../../shared/utils/animal-name.util';
import { getCurrentTimestamp } from '../../shared/utils/timestamp.util';
import { getErrorMessage } from '../../shared/utils/error.util';
import { STORAGE_KEYS } from '../../shared/constants/storage-keys';

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
        createdAt: getCurrentTimestamp(),
        isGuest: true,
      };

      // Validate user
      const validatedUser = UserSchemaV1.parse(user);

      // Store in localStorage
      localStorage.setItem(STORAGE_KEYS.GUEST_USER, JSON.stringify(validatedUser));

      // Update subject
      this.userSubject.next(validatedUser);

      return validatedUser;
    } catch (error) {
      throw new AuthError(`Failed to sign in: ${getErrorMessage(error)}`);
    }
  }

  async signOut(): Promise<void> {
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEYS.GUEST_USER);

    // Emit null via onChange()
    this.userSubject.next(null);
  }

  onChange(): Observable<User | null> {
    return this.userSubject.asObservable();
  }

  private loadUserFromStorage(): void {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEYS.GUEST_USER);
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const validatedUser = UserSchemaV1.parse(user);
        this.userSubject.next(validatedUser);
      }
    } catch (error) {
      // If validation fails, clear invalid data
      localStorage.removeItem(STORAGE_KEYS.GUEST_USER);
      this.userSubject.next(null);
    }
  }
}
