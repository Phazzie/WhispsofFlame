import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InputComponent } from './input.component';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

describe('InputComponent', () => {
  let component: InputComponent;
  let fixture: ComponentFixture<InputComponent>;
  let inputElement: DebugElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputComponent, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(InputComponent);
    component = fixture.componentInstance;
    inputElement = fixture.debugElement.query(By.css('input'));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Rendering', () => {
    it('should render input element', () => {
      expect(inputElement).toBeTruthy();
    });

    it('should have default text type', () => {
      expect(inputElement.nativeElement.type).toBe('text');
    });

    it('should have empty placeholder by default', () => {
      expect(inputElement.nativeElement.placeholder).toBe('');
    });

    it('should apply correct CSS classes', () => {
      const classes = inputElement.nativeElement.className;
      expect(classes).toContain('w-full');
      expect(classes).toContain('px-4');
      expect(classes).toContain('py-2');
      expect(classes).toContain('border');
      expect(classes).toContain('border-gray-300');
      expect(classes).toContain('rounded-md');
      expect(classes).toContain('focus:ring-2');
      expect(classes).toContain('focus:ring-blue-500');
      expect(classes).toContain('focus:border-transparent');
    });
  });

  describe('Input properties', () => {
    it('should set placeholder attribute', () => {
      component.placeholder = 'Enter your name';
      fixture.detectChanges();
      expect(inputElement.nativeElement.placeholder).toBe('Enter your name');
    });

    it('should set type attribute', () => {
      component.type = 'password';
      fixture.detectChanges();
      expect(inputElement.nativeElement.type).toBe('password');
    });

    it('should support email type', () => {
      component.type = 'email';
      fixture.detectChanges();
      expect(inputElement.nativeElement.type).toBe('email');
    });

    it('should support number type', () => {
      component.type = 'number';
      fixture.detectChanges();
      expect(inputElement.nativeElement.type).toBe('number');
    });

    it('should set maxLength attribute when provided', () => {
      component.maxLength = 10;
      fixture.detectChanges();
      expect(inputElement.nativeElement.maxLength).toBe(10);
    });

    it('should not set maxLength when undefined', () => {
      component.maxLength = undefined;
      fixture.detectChanges();
      // -1 is the default value for maxLength when not set
      expect(inputElement.nativeElement.maxLength).toBe(-1);
    });
  });

  describe('Two-way binding', () => {
    it('should initialize with empty value', () => {
      expect(component.value()).toBe('');
    });

    it('should update value when user types', async () => {
      const input = inputElement.nativeElement;
      input.value = 'Hello World';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.value()).toBe('Hello World');
    });

    it('should update input when value model changes', async () => {
      component.value.set('Test Value');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(inputElement.nativeElement.value).toBe('Test Value');
    });

    it('should handle multiple value updates', async () => {
      const input = inputElement.nativeElement;

      input.value = 'First';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.value()).toBe('First');

      input.value = 'Second';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.value()).toBe('Second');

      input.value = 'Third';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.value()).toBe('Third');
    });
  });

  describe('MaxLength enforcement', () => {
    it('should enforce maxLength constraint', async () => {
      component.maxLength = 5;
      fixture.detectChanges();
      await fixture.whenStable();

      const input = inputElement.nativeElement;
      input.value = '12345';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.value()).toBe('12345');

      // Try to add more characters
      input.value = '123456';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();

      // The browser should prevent typing beyond maxLength
      expect(input.value.length).toBeLessThanOrEqual(5);
    });

    it('should allow exact maxLength characters', async () => {
      component.maxLength = 10;
      fixture.detectChanges();
      await fixture.whenStable();

      const input = inputElement.nativeElement;
      input.value = '1234567890';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.value()).toBe('1234567890');
    });
  });

  describe('Value changes', () => {
    it('should handle empty string', async () => {
      const input = inputElement.nativeElement;
      input.value = '';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.value()).toBe('');
    });

    it('should handle special characters', async () => {
      const input = inputElement.nativeElement;
      const specialText = '!@#$%^&*()';
      input.value = specialText;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.value()).toBe(specialText);
    });

    it('should handle unicode characters', async () => {
      const input = inputElement.nativeElement;
      const unicode = '🐘🐬🦊';
      input.value = unicode;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.value()).toBe(unicode);
    });
  });

  describe('Integration tests', () => {
    it('should work with all properties set', async () => {
      component.placeholder = 'Enter code';
      component.type = 'text';
      component.maxLength = 6;
      fixture.detectChanges();
      await fixture.whenStable();

      expect(inputElement.nativeElement.placeholder).toBe('Enter code');
      expect(inputElement.nativeElement.type).toBe('text');
      expect(inputElement.nativeElement.maxLength).toBe(6);

      const input = inputElement.nativeElement;
      input.value = 'ABC123';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.value()).toBe('ABC123');
    });
  });
});
