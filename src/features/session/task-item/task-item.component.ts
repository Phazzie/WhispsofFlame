import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task, taskIsRevealed } from '../../../core/models/task.contract';
import { TaskService } from '../../../core/services/task.service';
import { formatRelativeTime } from '../../../shared/utils/date-format.util';

@Component({
  selector: 'app-task-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-item.component.html',
})
export class TaskItemComponent {
  @Input({ required: true }) task!: Task;

  constructor(private taskService: TaskService) {}

  /**
   * Check if task is revealed (getter to use in template)
   */
  isRevealed(): boolean {
    return taskIsRevealed(this.task);
  }

  /**
   * Vote to reveal a secret task
   */
  async voteReveal(): Promise<void> {
    try {
      await this.taskService.voteReveal(this.task.id);
    } catch (error) {
      console.error('Failed to vote reveal:', error);
    }
  }

  /**
   * Toggle task done status
   */
  async toggleDone(): Promise<void> {
    try {
      const updatedTask: Task = {
        ...this.task,
        status: this.task.status === 'done' ? 'active' : 'done',
      };
      await this.taskService.updateTask(updatedTask);
    } catch (error) {
      console.error('Failed to toggle done:', error);
    }
  }

  /**
   * Delete the task
   */
  async deleteTask(): Promise<void> {
    try {
      await this.taskService.deleteTask(this.task.id);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }

  /**
   * Format date as relative time (e.g., "2m ago", "1h ago")
   */
  formatDate(isoDate: string): string {
    return formatRelativeTime(isoDate);
  }
}
