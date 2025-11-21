import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { of, BehaviorSubject } from 'rxjs';
import { SessionComponent } from './session.component';
import { TaskService } from '../../core/services/task.service';
import { AuthProviderPort } from '../../core/ports/auth-provider.port';
import { SyncBusPort } from '../../core/ports/sync-bus.port';
import { User } from '../../core/models/user.contract';
import { Task } from '../../core/models/task.contract';

describe('SessionComponent', () => {
  let component: SessionComponent;
  let fixture: ComponentFixture<SessionComponent>;
  let mockTaskService: jasmine.SpyObj<TaskService>;
  let mockAuthProvider: jasmine.SpyObj<AuthProviderPort>;
  let mockSyncBus: jasmine.SpyObj<SyncBusPort>;
  let mockActivatedRoute: any;
  let statusSubject: BehaviorSubject<'connected' | 'disconnected' | 'error'>;
  let tasksSignal: any;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    displayName: 'Happy Elephant',
    avatar: 'elephant',
    createdAt: '2024-01-01T00:00:00.000Z',
    isGuest: true,
  };

  const mockTask: Task = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    sessionId: 'ABC123',
    content: 'Test task',
    isSecret: false,
    votedBy: [],
    status: 'active',
    createdBy: '123e4567-e89b-12d3-a456-426614174000',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    version: 1,
  };

  beforeEach(async () => {
    statusSubject = new BehaviorSubject<'connected' | 'disconnected' | 'error'>('disconnected');
    tasksSignal = signal<Task[]>([]);

    mockTaskService = jasmine.createSpyObj('TaskService', [
      'joinSession',
      'createTask',
      'leaveSession',
    ]);
    mockTaskService.tasks = tasksSignal.asReadonly();

    mockAuthProvider = jasmine.createSpyObj('AuthProviderPort', [
      'currentUser',
      'signIn',
    ]);

    mockSyncBus = jasmine.createSpyObj('SyncBusPort', [
      'status',
    ]);
    mockSyncBus.status.and.returnValue(statusSubject.asObservable());

    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.returnValue('ABC123'),
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [SessionComponent],
      providers: [
        { provide: TaskService, useValue: mockTaskService },
        { provide: AuthProviderPort, useValue: mockAuthProvider },
        { provide: SyncBusPort, useValue: mockSyncBus },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SessionComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load session on init with existing user', async () => {
      mockAuthProvider.currentUser.and.returnValue(Promise.resolve(mockUser));
      mockTaskService.joinSession.and.returnValue(Promise.resolve());

      await component.ngOnInit();

      expect(component.sessionId).toBe('ABC123');
      expect(component.user()).toEqual(mockUser);
      expect(mockAuthProvider.currentUser).toHaveBeenCalled();
      expect(mockAuthProvider.signIn).not.toHaveBeenCalled();
      expect(mockTaskService.joinSession).toHaveBeenCalledWith('ABC123');
    });

    it('should sign in as guest if no user exists', async () => {
      mockAuthProvider.currentUser.and.returnValue(Promise.resolve(null));
      mockAuthProvider.signIn.and.returnValue(Promise.resolve(mockUser));
      mockTaskService.joinSession.and.returnValue(Promise.resolve());

      await component.ngOnInit();

      expect(mockAuthProvider.currentUser).toHaveBeenCalled();
      expect(mockAuthProvider.signIn).toHaveBeenCalled();
      expect(component.user()).toEqual(mockUser);
      expect(mockTaskService.joinSession).toHaveBeenCalledWith('ABC123');
    });

    it('should subscribe to sync status', async () => {
      mockAuthProvider.currentUser.and.returnValue(Promise.resolve(mockUser));
      mockTaskService.joinSession.and.returnValue(Promise.resolve());

      await component.ngOnInit();

      expect(component.connectionStatus()).toBe('disconnected');

      statusSubject.next('connected');
      expect(component.connectionStatus()).toBe('connected');

      statusSubject.next('error');
      expect(component.connectionStatus()).toBe('error');
    });

    it('should handle errors during initialization', async () => {
      mockAuthProvider.currentUser.and.returnValue(Promise.resolve(mockUser));
      mockTaskService.joinSession.and.returnValue(
        Promise.reject(new Error('Connection failed'))
      );

      await component.ngOnInit();

      expect(component.connectionStatus()).toBe('error');
    });

    it('should handle missing sessionId in route', async () => {
      mockActivatedRoute.snapshot.paramMap.get.and.returnValue(null);

      await component.ngOnInit();

      expect(mockTaskService.joinSession).not.toHaveBeenCalled();
    });
  });

  describe('addTask', () => {
    beforeEach(async () => {
      mockAuthProvider.currentUser.and.returnValue(Promise.resolve(mockUser));
      mockTaskService.joinSession.and.returnValue(Promise.resolve());
      await component.ngOnInit();
    });

    it('should create task with content and isSecret flag', async () => {
      component.newTaskContent = 'New task content';
      component.isSecret = true;
      mockTaskService.createTask.and.returnValue(Promise.resolve(mockTask));

      await component.addTask();

      expect(mockTaskService.createTask).toHaveBeenCalledWith(
        'New task content',
        true
      );
      expect(component.newTaskContent).toBe('');
      expect(component.isSecret).toBe(false);
    });

    it('should not create task with empty content', async () => {
      component.newTaskContent = '';
      mockTaskService.createTask.and.returnValue(Promise.resolve(mockTask));

      await component.addTask();

      expect(mockTaskService.createTask).not.toHaveBeenCalled();
    });

    it('should not create task with whitespace-only content', async () => {
      component.newTaskContent = '   ';
      mockTaskService.createTask.and.returnValue(Promise.resolve(mockTask));

      await component.addTask();

      expect(mockTaskService.createTask).not.toHaveBeenCalled();
    });

    it('should handle errors when creating task', async () => {
      component.newTaskContent = 'New task';
      mockTaskService.createTask.and.returnValue(
        Promise.reject(new Error('Create failed'))
      );

      await component.addTask();

      // Should not throw, error is logged
      expect(mockTaskService.createTask).toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    beforeEach(async () => {
      mockAuthProvider.currentUser.and.returnValue(Promise.resolve(mockUser));
      mockTaskService.joinSession.and.returnValue(Promise.resolve());
      await component.ngOnInit();
    });

    it('should leave session on destroy', async () => {
      mockTaskService.leaveSession.and.returnValue(Promise.resolve());

      await component.ngOnDestroy();

      expect(mockTaskService.leaveSession).toHaveBeenCalled();
    });

    it('should unsubscribe from status subscription', async () => {
      mockTaskService.leaveSession.and.returnValue(Promise.resolve());

      const subscription = (component as any).statusSubscription;
      expect(subscription).toBeTruthy();

      await component.ngOnDestroy();

      expect((component as any).statusSubscription).toBeNull();
    });

    it('should handle errors when leaving session', async () => {
      mockTaskService.leaveSession.and.returnValue(
        Promise.reject(new Error('Leave failed'))
      );

      await component.ngOnDestroy();

      // Should not throw, error is logged
      expect(mockTaskService.leaveSession).toHaveBeenCalled();
    });
  });

  describe('connectionStatusClass', () => {
    it('should return green for connected status', () => {
      component.connectionStatus.set('connected');
      expect(component.connectionStatusClass()).toBe('text-green-600');
    });

    it('should return gray for disconnected status', () => {
      component.connectionStatus.set('disconnected');
      expect(component.connectionStatusClass()).toBe('text-gray-500');
    });

    it('should return red for error status', () => {
      component.connectionStatus.set('error');
      expect(component.connectionStatusClass()).toBe('text-red-600');
    });
  });

  describe('Template Integration', () => {
    beforeEach(async () => {
      mockAuthProvider.currentUser.and.returnValue(Promise.resolve(mockUser));
      mockTaskService.joinSession.and.returnValue(Promise.resolve());
      tasksSignal.set([mockTask]);
    });

    it('should display session ID', async () => {
      await component.ngOnInit();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('h1')?.textContent).toContain('ABC123');
    });

    it('should display user info', async () => {
      await component.ngOnInit();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const userInfo = compiled.querySelector('.text-sm.text-gray-600')?.textContent;
      expect(userInfo).toContain('Happy Elephant');
      expect(userInfo).toContain('elephant');
    });

    it('should display connection status', async () => {
      await component.ngOnInit();
      statusSubject.next('connected');
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const statusElement = compiled.querySelector('.text-green-600');
      expect(statusElement?.textContent).toContain('connected');
    });

    it('should display task count', async () => {
      await component.ngOnInit();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Tasks (1)');
    });

    it('should display empty state when no tasks', async () => {
      tasksSignal.set([]);
      await component.ngOnInit();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('No tasks yet. Add one above!');
    });

    it('should bind task input with ngModel', async () => {
      await component.ngOnInit();
      fixture.detectChanges();

      const input = fixture.nativeElement.querySelector('[data-testid="task-input"]') as HTMLInputElement;
      expect(input).toBeTruthy();

      input.value = 'Test task';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.newTaskContent).toBe('Test task');
    });

    it('should bind secret toggle with ngModel', async () => {
      await component.ngOnInit();
      fixture.detectChanges();

      const checkbox = fixture.nativeElement.querySelector('[data-testid="secret-toggle"]') as HTMLInputElement;
      expect(checkbox).toBeTruthy();

      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(component.isSecret).toBe(true);
    });

    it('should call addTask on form submit', async () => {
      await component.ngOnInit();
      fixture.detectChanges();

      spyOn(component, 'addTask');

      const form = fixture.nativeElement.querySelector('form');
      form.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      expect(component.addTask).toHaveBeenCalled();
    });
  });
});
