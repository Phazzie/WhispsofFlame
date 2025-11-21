import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { SessionService } from '../../core/services/session.service';
import { ValidationError } from '../../core/errors/validation.error';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let mockSessionService: jasmine.SpyObj<SessionService>;

  beforeEach(async () => {
    // Create mock SessionService
    mockSessionService = jasmine.createSpyObj('SessionService', [
      'joinSession',
      'createSession'
    ]);

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        { provide: SessionService, useValue: mockSessionService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Template Rendering', () => {
    it('should render the title', () => {
      const compiled = fixture.nativeElement;
      const title = compiled.querySelector('h1');
      expect(title.textContent).toContain('WhispsofFlame');
    });

    it('should render the subtitle', () => {
      const compiled = fixture.nativeElement;
      const subtitle = compiled.querySelector('p');
      expect(subtitle.textContent).toContain('Real-time collaborative task board');
    });

    it('should render session code input', () => {
      const compiled = fixture.nativeElement;
      const input = compiled.querySelector('[data-testid="session-code-input"]');
      expect(input).toBeTruthy();
    });

    it('should render join session button', () => {
      const compiled = fixture.nativeElement;
      const button = compiled.querySelector('[data-testid="join-session-btn"]');
      expect(button).toBeTruthy();
      expect(button.textContent).toContain('Join Session');
    });

    it('should render create session button', () => {
      const compiled = fixture.nativeElement;
      const button = compiled.querySelector('[data-testid="create-session-btn"]');
      expect(button).toBeTruthy();
      expect(button.textContent).toContain('Create New Session');
    });

    it('should not show error message initially', () => {
      const compiled = fixture.nativeElement;
      const error = compiled.querySelector('.text-red-500');
      expect(error).toBeFalsy();
    });

    it('should show error message when error is set', () => {
      component.error = 'Test error message';
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const error = compiled.querySelector('.text-red-500');
      expect(error).toBeTruthy();
      expect(error.textContent).toContain('Test error message');
    });
  });

  describe('joinSession()', () => {
    it('should call sessionService.joinSession with uppercase code', async () => {
      mockSessionService.joinSession.and.returnValue(Promise.resolve());
      component.sessionCode = 'abc123';

      await component.joinSession();

      expect(mockSessionService.joinSession).toHaveBeenCalledWith('ABC123');
      expect(component.error).toBeNull();
    });

    it('should clear previous errors before joining', async () => {
      mockSessionService.joinSession.and.returnValue(Promise.resolve());
      component.error = 'Previous error';
      component.sessionCode = 'ABC123';

      await component.joinSession();

      expect(component.error).toBeNull();
    });

    it('should show error if session code is empty', async () => {
      component.sessionCode = '';

      await component.joinSession();

      expect(mockSessionService.joinSession).not.toHaveBeenCalled();
      expect(component.error).toBe('Please enter a session code');
    });

    it('should show error if session code is only whitespace', async () => {
      component.sessionCode = '   ';

      await component.joinSession();

      expect(mockSessionService.joinSession).not.toHaveBeenCalled();
      expect(component.error).toBe('Please enter a session code');
    });

    it('should trim whitespace from session code', async () => {
      mockSessionService.joinSession.and.returnValue(Promise.resolve());
      component.sessionCode = '  abc123  ';

      await component.joinSession();

      expect(mockSessionService.joinSession).toHaveBeenCalledWith('ABC123');
    });

    it('should handle ValidationError from service', async () => {
      const validationError = new ValidationError('Invalid session code format. Expected 6 uppercase alphanumeric characters.', []);
      mockSessionService.joinSession.and.returnValue(Promise.reject(validationError));
      component.sessionCode = 'INVALID';

      await component.joinSession();

      expect(component.error).toBe('Invalid session code format. Expected 6 uppercase alphanumeric characters.');
    });

    it('should handle generic errors from service', async () => {
      const genericError = new Error('Network error');
      mockSessionService.joinSession.and.returnValue(Promise.reject(genericError));
      component.sessionCode = 'ABC123';
      spyOn(console, 'error');

      await component.joinSession();

      expect(component.error).toBe('Failed to join session. Please try again.');
      expect(console.error).toHaveBeenCalledWith('Join session error:', genericError);
    });
  });

  describe('createSession()', () => {
    it('should call sessionService.createSession', async () => {
      mockSessionService.createSession.and.returnValue(Promise.resolve('ABC123'));

      await component.createSession();

      expect(mockSessionService.createSession).toHaveBeenCalled();
      expect(component.error).toBeNull();
    });

    it('should clear previous errors before creating', async () => {
      mockSessionService.createSession.and.returnValue(Promise.resolve('ABC123'));
      component.error = 'Previous error';

      await component.createSession();

      expect(component.error).toBeNull();
    });

    it('should handle errors from service', async () => {
      const error = new Error('Failed to create');
      mockSessionService.createSession.and.returnValue(Promise.reject(error));
      spyOn(console, 'error');

      await component.createSession();

      expect(component.error).toBe('Failed to create session. Please try again.');
      expect(console.error).toHaveBeenCalledWith('Create session error:', error);
    });
  });

  describe('onInputChange()', () => {
    it('should clear error when called', () => {
      component.error = 'Some error';

      component.onInputChange();

      expect(component.error).toBeNull();
    });

    it('should convert session code to uppercase', () => {
      component.sessionCode = 'abc123';

      component.onInputChange();

      expect(component.sessionCode).toBe('ABC123');
    });

    it('should handle mixed case input', () => {
      component.sessionCode = 'AbC123';

      component.onInputChange();

      expect(component.sessionCode).toBe('ABC123');
    });
  });

  describe('Input binding', () => {
    it('should update sessionCode when user types', () => {
      const input = fixture.nativeElement.querySelector('[data-testid="session-code-input"]') as HTMLInputElement;

      input.value = 'XYZ789';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.sessionCode).toBe('XYZ789');
    });
  });
});
