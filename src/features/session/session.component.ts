import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { TaskService } from '../../core/services/task.service';
import { AuthProviderPort } from '../../core/ports/auth-provider.port';
import { SyncBusPort } from '../../core/ports/sync-bus.port';
import { User } from '../../core/models/user.contract';
import { TaskItemComponent } from './task-item/task-item.component';

@Component({
  selector: 'app-session',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskItemComponent],
  templateUrl: './session.component.html',
})
export class SessionComponent implements OnInit, OnDestroy {
  sessionId: string = '';
  user = signal<User | null>(null);
  connectionStatus = signal<'connected' | 'disconnected' | 'error'>('disconnected');
  newTaskContent = '';
  isSecret = false;

  private statusSubscription: Subscription | null = null;

  connectionStatusClass = computed(() => {
    const status = this.connectionStatus();
    switch (status) {
      case 'connected':
        return 'text-green-600';
      case 'disconnected':
        return 'text-gray-500';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  });

  constructor(
    public taskService: TaskService,
    private authProvider: AuthProviderPort,
    private syncBus: SyncBusPort,
    private route: ActivatedRoute
  ) {}

  async ngOnInit(): Promise<void> {
    // Get sessionId from route params
    this.sessionId = this.route.snapshot.paramMap.get('sessionId') || '';

    if (!this.sessionId) {
      console.error('No sessionId provided in route');
      return;
    }

    try {
      // Get current user from AuthProvider
      let currentUser = await this.authProvider.currentUser();

      // If no user, sign in as guest
      if (!currentUser) {
        currentUser = await this.authProvider.signIn();
      }

      this.user.set(currentUser);

      // Join session via TaskService
      await this.taskService.joinSession(this.sessionId);

      // Subscribe to sync status
      this.statusSubscription = this.syncBus.status().subscribe({
        next: (status) => {
          this.connectionStatus.set(status);
        },
        error: (err) => {
          console.error('Status subscription error:', err);
          this.connectionStatus.set('error');
        },
      });
    } catch (error) {
      console.error('Error initializing session:', error);
      this.connectionStatus.set('error');
    }
  }

  async addTask(): Promise<void> {
    if (!this.newTaskContent.trim()) {
      return;
    }

    try {
      await this.taskService.createTask(this.newTaskContent, this.isSecret);

      // Clear form
      this.newTaskContent = '';
      this.isSecret = false;
    } catch (error) {
      console.error('Error creating task:', error);
    }
  }

  async ngOnDestroy(): Promise<void> {
    // Unsubscribe from status
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
      this.statusSubscription = null;
    }

    // Leave session
    try {
      await this.taskService.leaveSession();
    } catch (error) {
      console.error('Error leaving session:', error);
    }
  }
}
