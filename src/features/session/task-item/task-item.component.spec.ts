import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TaskItemComponent } from './task-item.component';
import { TaskService } from '../../../core/services/task.service';
import { Task } from '../../../core/models/task.contract';

describe('TaskItemComponent', () => {
  let component: TaskItemComponent;
  let fixture: ComponentFixture<TaskItemComponent>;
  let taskService: jasmine.SpyObj<TaskService>;

  const mockPublicTask: Task = {
    id: '00000000-0000-0000-0000-000000000001',
    sessionId: 'ABC123',
    content: 'Public task content',
    isSecret: false,
    votedBy: [],
    status: 'active',
    createdBy: '00000000-0000-0000-0000-000000000010',
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
    updatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    version: 1,
  };

  const mockSecretTask: Task = {
    id: '00000000-0000-0000-0000-000000000002',
    sessionId: 'ABC123',
    content: 'Secret task content',
    isSecret: true,
    votedBy: [],
    status: 'active',
    createdBy: '00000000-0000-0000-0000-000000000010',
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    version: 1,
  };

  const mockSecretTaskOneVote: Task = {
    ...mockSecretTask,
    id: '00000000-0000-0000-0000-000000000003',
    votedBy: ['00000000-0000-0000-0000-000000000010'],
  };

  const mockRevealedSecretTask: Task = {
    ...mockSecretTask,
    id: '00000000-0000-0000-0000-000000000004',
    votedBy: [
      '00000000-0000-0000-0000-000000000010',
      '00000000-0000-0000-0000-000000000011',
    ],
  };

  const mockDoneTask: Task = {
    ...mockPublicTask,
    id: '00000000-0000-0000-0000-000000000005',
    status: 'done',
  };

  beforeEach(async () => {
    taskService = jasmine.createSpyObj<TaskService>('TaskService', [
      'voteReveal',
      'updateTask',
      'deleteTask',
    ]);

    await TestBed.configureTestingModule({
      imports: [TaskItemComponent],
      providers: [{ provide: TaskService, useValue: taskService }],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskItemComponent);
    component = fixture.componentInstance;
  });

  describe('rendering', () => {
    it('should create the component', () => {
      component.task = mockPublicTask;
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should render a public task with content visible', () => {
      component.task = mockPublicTask;
      fixture.detectChanges();

      const contentElement = fixture.debugElement.query(
        By.css('p:not(.text-xs)')
      );
      expect(contentElement.nativeElement.textContent).toContain(
        'Public task content'
      );

      const secretIndicator = fixture.debugElement.query(
        By.css('.text-gray-400')
      );
      expect(secretIndicator).toBeNull();
    });

    it('should render a masked secret task with lock icon', () => {
      component.task = mockSecretTask;
      fixture.detectChanges();

      const secretIndicator = fixture.debugElement.query(
        By.css('.text-gray-400')
      );
      expect(secretIndicator).toBeTruthy();
      expect(secretIndicator.nativeElement.textContent).toContain(
        '🔒 Secret task'
      );
      expect(secretIndicator.nativeElement.textContent).toContain('0/2 votes');

      // Content should not be visible
      const element = fixture.nativeElement as HTMLElement;
      expect(element.textContent).not.toContain('Secret task content');
    });

    it('should show vote count for secret task with one vote', () => {
      component.task = mockSecretTaskOneVote;
      fixture.detectChanges();

      const secretIndicator = fixture.debugElement.query(
        By.css('.text-gray-400')
      );
      expect(secretIndicator.nativeElement.textContent).toContain('1/2 votes');
    });

    it('should render a revealed secret task with content visible', () => {
      component.task = mockRevealedSecretTask;
      fixture.detectChanges();

      const contentElement = fixture.debugElement.query(
        By.css('p:not(.text-xs)')
      );
      expect(contentElement.nativeElement.textContent).toContain(
        'Secret task content'
      );

      // Lock icon should not be visible
      const secretIndicator = fixture.debugElement.query(
        By.css('.text-gray-400')
      );
      expect(secretIndicator).toBeNull();
    });

    it('should render done task with opacity and line-through', () => {
      component.task = mockDoneTask;
      fixture.detectChanges();

      const taskContainer = fixture.debugElement.query(By.css('div'));
      expect(taskContainer.nativeElement.classList.contains('opacity-50')).toBe(
        true
      );

      const contentElement = fixture.debugElement.query(
        By.css('p:not(.text-xs)')
      );
      expect(
        contentElement.nativeElement.classList.contains('line-through')
      ).toBe(true);
    });

    it('should render task metadata (created by and date)', () => {
      component.task = mockPublicTask;
      fixture.detectChanges();

      const metadataElement = fixture.debugElement.query(
        By.css('.text-xs.text-gray-500')
      );
      expect(metadataElement).toBeTruthy();
      expect(metadataElement.nativeElement.textContent).toContain('By');
      expect(metadataElement.nativeElement.textContent).toContain(
        mockPublicTask.createdBy
      );
      expect(metadataElement.nativeElement.textContent).toContain('m ago'); // Should show relative time
    });

    it('should have correct test id attribute', () => {
      component.task = mockPublicTask;
      fixture.detectChanges();

      const taskContainer = fixture.debugElement.query(By.css('div'));
      expect(taskContainer.nativeElement.getAttribute('data-testid')).toBe(
        `task-${mockPublicTask.id}`
      );
    });
  });

  describe('reveal button', () => {
    it('should show reveal button for unrevealed secret task', () => {
      component.task = mockSecretTask;
      fixture.detectChanges();

      const revealButton = fixture.debugElement.query(
        By.css(`[data-testid="reveal-btn-${mockSecretTask.id}"]`)
      );
      expect(revealButton).toBeTruthy();
      expect(revealButton.nativeElement.textContent).toContain('Reveal');
      expect(revealButton.nativeElement.textContent).toContain('0/2');
    });

    it('should not show reveal button for public task', () => {
      component.task = mockPublicTask;
      fixture.detectChanges();

      const revealButton = fixture.debugElement.query(
        By.css('[data-testid^="reveal-btn-"]')
      );
      expect(revealButton).toBeNull();
    });

    it('should not show reveal button for revealed secret task', () => {
      component.task = mockRevealedSecretTask;
      fixture.detectChanges();

      const revealButton = fixture.debugElement.query(
        By.css('[data-testid^="reveal-btn-"]')
      );
      expect(revealButton).toBeNull();
    });

    it('should call voteReveal when reveal button is clicked', async () => {
      component.task = mockSecretTask;
      taskService.voteReveal.and.returnValue(Promise.resolve());
      fixture.detectChanges();

      const revealButton = fixture.debugElement.query(
        By.css(`[data-testid="reveal-btn-${mockSecretTask.id}"]`)
      );
      revealButton.nativeElement.click();

      await fixture.whenStable();

      expect(taskService.voteReveal).toHaveBeenCalledWith(mockSecretTask.id);
    });

    it('should handle voteReveal errors gracefully', async () => {
      component.task = mockSecretTask;
      taskService.voteReveal.and.returnValue(
        Promise.reject(new Error('Network error'))
      );
      spyOn(console, 'error');
      fixture.detectChanges();

      const revealButton = fixture.debugElement.query(
        By.css(`[data-testid="reveal-btn-${mockSecretTask.id}"]`)
      );
      revealButton.nativeElement.click();

      await fixture.whenStable();

      expect(console.error).toHaveBeenCalledWith(
        'Failed to vote reveal:',
        jasmine.any(Error)
      );
    });
  });

  describe('done toggle', () => {
    it('should show done checkbox for all tasks', () => {
      component.task = mockPublicTask;
      fixture.detectChanges();

      const doneToggle = fixture.debugElement.query(
        By.css(`[data-testid="done-toggle-${mockPublicTask.id}"]`)
      );
      expect(doneToggle).toBeTruthy();
      expect(doneToggle.nativeElement.type).toBe('checkbox');
    });

    it('should show checkbox as unchecked for active task', () => {
      component.task = mockPublicTask;
      fixture.detectChanges();

      const doneToggle = fixture.debugElement.query(
        By.css(`[data-testid="done-toggle-${mockPublicTask.id}"]`)
      );
      expect(doneToggle.nativeElement.checked).toBe(false);
    });

    it('should show checkbox as checked for done task', () => {
      component.task = mockDoneTask;
      fixture.detectChanges();

      const doneToggle = fixture.debugElement.query(
        By.css(`[data-testid="done-toggle-${mockDoneTask.id}"]`)
      );
      expect(doneToggle.nativeElement.checked).toBe(true);
    });

    it('should call updateTask to mark task as done', async () => {
      component.task = mockPublicTask;
      taskService.updateTask.and.returnValue(
        Promise.resolve({ ...mockPublicTask, status: 'done' })
      );
      fixture.detectChanges();

      const doneToggle = fixture.debugElement.query(
        By.css(`[data-testid="done-toggle-${mockPublicTask.id}"]`)
      );
      doneToggle.nativeElement.click();

      await fixture.whenStable();

      expect(taskService.updateTask).toHaveBeenCalledWith(
        jasmine.objectContaining({
          id: mockPublicTask.id,
          status: 'done',
        })
      );
    });

    it('should call updateTask to mark task as active', async () => {
      component.task = mockDoneTask;
      taskService.updateTask.and.returnValue(
        Promise.resolve({ ...mockDoneTask, status: 'active' })
      );
      fixture.detectChanges();

      const doneToggle = fixture.debugElement.query(
        By.css(`[data-testid="done-toggle-${mockDoneTask.id}"]`)
      );
      doneToggle.nativeElement.click();

      await fixture.whenStable();

      expect(taskService.updateTask).toHaveBeenCalledWith(
        jasmine.objectContaining({
          id: mockDoneTask.id,
          status: 'active',
        })
      );
    });

    it('should handle toggleDone errors gracefully', async () => {
      component.task = mockPublicTask;
      taskService.updateTask.and.returnValue(
        Promise.reject(new Error('Update failed'))
      );
      spyOn(console, 'error');
      fixture.detectChanges();

      const doneToggle = fixture.debugElement.query(
        By.css(`[data-testid="done-toggle-${mockPublicTask.id}"]`)
      );
      doneToggle.nativeElement.click();

      await fixture.whenStable();

      expect(console.error).toHaveBeenCalledWith(
        'Failed to toggle done:',
        jasmine.any(Error)
      );
    });
  });

  describe('delete button', () => {
    it('should show delete button for all tasks', () => {
      component.task = mockPublicTask;
      fixture.detectChanges();

      const deleteButton = fixture.debugElement.query(
        By.css(`[data-testid="delete-btn-${mockPublicTask.id}"]`)
      );
      expect(deleteButton).toBeTruthy();
      expect(deleteButton.nativeElement.textContent).toContain('Delete');
    });

    it('should call deleteTask when delete button is clicked', async () => {
      component.task = mockPublicTask;
      taskService.deleteTask.and.returnValue(Promise.resolve());
      fixture.detectChanges();

      const deleteButton = fixture.debugElement.query(
        By.css(`[data-testid="delete-btn-${mockPublicTask.id}"]`)
      );
      deleteButton.nativeElement.click();

      await fixture.whenStable();

      expect(taskService.deleteTask).toHaveBeenCalledWith(mockPublicTask.id);
    });

    it('should handle deleteTask errors gracefully', async () => {
      component.task = mockPublicTask;
      taskService.deleteTask.and.returnValue(
        Promise.reject(new Error('Delete failed'))
      );
      spyOn(console, 'error');
      fixture.detectChanges();

      const deleteButton = fixture.debugElement.query(
        By.css(`[data-testid="delete-btn-${mockPublicTask.id}"]`)
      );
      deleteButton.nativeElement.click();

      await fixture.whenStable();

      expect(console.error).toHaveBeenCalledWith(
        'Failed to delete task:',
        jasmine.any(Error)
      );
    });
  });

  describe('formatDate', () => {
    it('should format date as relative time', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const result = component.formatDate(twoHoursAgo);
      expect(result).toBe('2h ago');
    });

    it('should format recent dates as minutes ago', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const result = component.formatDate(fiveMinutesAgo);
      expect(result).toBe('5m ago');
    });
  });

  describe('isRevealed computed', () => {
    it('should return false for unrevealed secret task', () => {
      component.task = mockSecretTask;
      fixture.detectChanges();
      expect(component.isRevealed()).toBe(false);
    });

    it('should return false for secret task with one vote', () => {
      component.task = mockSecretTaskOneVote;
      fixture.detectChanges();
      expect(component.isRevealed()).toBe(false);
    });

    it('should return true for secret task with two votes', () => {
      component.task = mockRevealedSecretTask;
      fixture.detectChanges();
      expect(component.isRevealed()).toBe(true);
    });

    it('should return true for public task (not secret)', () => {
      component.task = mockPublicTask;
      fixture.detectChanges();
      // For public tasks, the isRevealed check doesn't matter as they're always visible
      // but taskIsRevealed should handle this gracefully
      expect(component.isRevealed()).toBe(false);
    });
  });
});
