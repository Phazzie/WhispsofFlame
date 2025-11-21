import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../core/services/session.service';
import { ValidationError } from '../../core/errors/validation.error';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html'
})
export class HomeComponent {
  sessionCode: string = '';
  error: string | null = null;

  constructor(private sessionService: SessionService) {}

  /**
   * Join an existing session using the entered session code
   */
  async joinSession(): Promise<void> {
    // Clear previous errors
    this.error = null;

    // Trim and convert to uppercase
    const code = this.sessionCode.trim().toUpperCase();

    // Validate code is not empty
    if (!code) {
      this.error = 'Please enter a session code';
      return;
    }

    try {
      await this.sessionService.joinSession(code);
      // Router navigates automatically on success
    } catch (err) {
      if (err instanceof ValidationError) {
        this.error = err.message;
      } else {
        this.error = 'Failed to join session. Please try again.';
        console.error('Join session error:', err);
      }
    }
  }

  /**
   * Create a new session with a randomly generated code
   */
  async createSession(): Promise<void> {
    // Clear previous errors
    this.error = null;

    try {
      await this.sessionService.createSession();
      // Router navigates automatically on success
    } catch (err) {
      this.error = 'Failed to create session. Please try again.';
      console.error('Create session error:', err);
    }
  }

  /**
   * Clear error when user types in the input
   */
  onInputChange(): void {
    this.error = null;
    // Convert to uppercase automatically
    this.sessionCode = this.sessionCode.toUpperCase();
  }
}
