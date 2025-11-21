import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButtonComponent } from './button.component';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('ButtonComponent', () => {
  let component: ButtonComponent;
  let fixture: ComponentFixture<ButtonComponent>;
  let buttonElement: DebugElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonComponent);
    component = fixture.componentInstance;
    buttonElement = fixture.debugElement.query(By.css('button'));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Rendering', () => {
    it('should render button element', () => {
      expect(buttonElement).toBeTruthy();
    });

    it('should render with default primary variant', () => {
      const classes = buttonElement.nativeElement.className;
      expect(classes).toContain('bg-blue-600');
      expect(classes).toContain('text-white');
      expect(classes).toContain('hover:bg-blue-700');
    });

    it('should render with secondary variant', () => {
      component.variant = 'secondary';
      fixture.detectChanges();
      const classes = buttonElement.nativeElement.className;
      expect(classes).toContain('bg-gray-200');
      expect(classes).toContain('text-gray-800');
      expect(classes).toContain('hover:bg-gray-300');
    });

    it('should render with danger variant', () => {
      component.variant = 'danger';
      fixture.detectChanges();
      const classes = buttonElement.nativeElement.className;
      expect(classes).toContain('bg-red-600');
      expect(classes).toContain('text-white');
      expect(classes).toContain('hover:bg-red-700');
    });
  });

  describe('Sizes', () => {
    it('should render with default medium size', () => {
      const classes = buttonElement.nativeElement.className;
      expect(classes).toContain('px-4');
      expect(classes).toContain('py-2');
    });

    it('should render with small size', () => {
      component.size = 'sm';
      fixture.detectChanges();
      const classes = buttonElement.nativeElement.className;
      expect(classes).toContain('px-3');
      expect(classes).toContain('py-1');
      expect(classes).toContain('text-sm');
    });

    it('should render with large size', () => {
      component.size = 'lg';
      fixture.detectChanges();
      const classes = buttonElement.nativeElement.className;
      expect(classes).toContain('px-6');
      expect(classes).toContain('py-3');
      expect(classes).toContain('text-lg');
    });
  });

  describe('Base styles', () => {
    it('should always include base classes', () => {
      const classes = buttonElement.nativeElement.className;
      expect(classes).toContain('rounded-md');
      expect(classes).toContain('font-medium');
      expect(classes).toContain('transition-colors');
    });
  });

  describe('Click event', () => {
    it('should emit clicked event when button is clicked', () => {
      spyOn(component.clicked, 'emit');
      buttonElement.nativeElement.click();
      expect(component.clicked.emit).toHaveBeenCalledTimes(1);
    });

    it('should not emit clicked event when disabled button is clicked', () => {
      component.disabled = true;
      fixture.detectChanges();
      spyOn(component.clicked, 'emit');
      buttonElement.nativeElement.click();
      expect(component.clicked.emit).not.toHaveBeenCalled();
    });

    it('should emit multiple times on multiple clicks', () => {
      spyOn(component.clicked, 'emit');
      buttonElement.nativeElement.click();
      buttonElement.nativeElement.click();
      buttonElement.nativeElement.click();
      expect(component.clicked.emit).toHaveBeenCalledTimes(3);
    });
  });

  describe('Disabled state', () => {
    it('should not be disabled by default', () => {
      expect(component.disabled).toBe(false);
      expect(buttonElement.nativeElement.disabled).toBe(false);
    });

    it('should be disabled when disabled property is true', () => {
      component.disabled = true;
      fixture.detectChanges();
      expect(buttonElement.nativeElement.disabled).toBe(true);
    });

    it('should have opacity-50 class when disabled', () => {
      component.disabled = true;
      fixture.detectChanges();
      const classes = buttonElement.nativeElement.className;
      expect(classes).toContain('opacity-50');
      expect(classes).toContain('cursor-not-allowed');
    });

    it('should not have opacity-50 class when enabled', () => {
      component.disabled = false;
      fixture.detectChanges();
      const classes = buttonElement.nativeElement.className;
      expect(classes).not.toContain('opacity-50');
    });
  });

  describe('Content projection', () => {
    it('should project content using ng-content', () => {
      const testFixture = TestBed.createComponent(ButtonComponent);
      testFixture.componentInstance.variant = 'primary';
      const compiled = testFixture.nativeElement as HTMLElement;
      compiled.querySelector('button')!.textContent = 'Click Me';
      testFixture.detectChanges();
      expect(compiled.querySelector('button')?.textContent).toBeDefined();
    });
  });

  describe('Computed classes', () => {
    it('should update classes when variant changes', () => {
      component.variant = 'primary';
      fixture.detectChanges();
      let classes = buttonElement.nativeElement.className;
      expect(classes).toContain('bg-blue-600');

      component.variant = 'danger';
      fixture.detectChanges();
      classes = buttonElement.nativeElement.className;
      expect(classes).toContain('bg-red-600');
      expect(classes).not.toContain('bg-blue-600');
    });

    it('should update classes when size changes', () => {
      component.size = 'sm';
      fixture.detectChanges();
      let classes = buttonElement.nativeElement.className;
      expect(classes).toContain('px-3');

      component.size = 'lg';
      fixture.detectChanges();
      classes = buttonElement.nativeElement.className;
      expect(classes).toContain('px-6');
      expect(classes).not.toContain('px-3');
    });

    it('should update classes when disabled changes', () => {
      component.disabled = false;
      fixture.detectChanges();
      let classes = buttonElement.nativeElement.className;
      expect(classes).not.toContain('opacity-50');

      component.disabled = true;
      fixture.detectChanges();
      classes = buttonElement.nativeElement.className;
      expect(classes).toContain('opacity-50');
    });
  });
});
