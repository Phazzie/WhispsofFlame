import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvatarComponent } from './avatar.component';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('AvatarComponent', () => {
  let component: AvatarComponent;
  let fixture: ComponentFixture<AvatarComponent>;
  let divElement: DebugElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvatarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AvatarComponent);
    component = fixture.componentInstance;
    divElement = fixture.debugElement.query(By.css('div'));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Rendering', () => {
    it('should render div element', () => {
      expect(divElement).toBeTruthy();
    });

    it('should render with default elephant avatar', () => {
      const content = divElement.nativeElement.textContent.trim();
      expect(content).toBe('🐘');
    });

    it('should render with default medium size', () => {
      const classes = divElement.nativeElement.className;
      expect(classes).toContain('w-12');
      expect(classes).toContain('h-12');
      expect(classes).toContain('text-2xl');
    });
  });

  describe('Animal emojis', () => {
    it('should display elephant emoji', () => {
      component.avatar = 'elephant';
      fixture.detectChanges();
      const content = divElement.nativeElement.textContent.trim();
      expect(content).toBe('🐘');
    });

    it('should display dolphin emoji', () => {
      component.avatar = 'dolphin';
      fixture.detectChanges();
      const content = divElement.nativeElement.textContent.trim();
      expect(content).toBe('🐬');
    });

    it('should display fox emoji', () => {
      component.avatar = 'fox';
      fixture.detectChanges();
      const content = divElement.nativeElement.textContent.trim();
      expect(content).toBe('🦊');
    });

    it('should display owl emoji', () => {
      component.avatar = 'owl';
      fixture.detectChanges();
      const content = divElement.nativeElement.textContent.trim();
      expect(content).toBe('🦉');
    });

    it('should display bear emoji', () => {
      component.avatar = 'bear';
      fixture.detectChanges();
      const content = divElement.nativeElement.textContent.trim();
      expect(content).toBe('🐻');
    });

    it('should display wolf emoji', () => {
      component.avatar = 'wolf';
      fixture.detectChanges();
      const content = divElement.nativeElement.textContent.trim();
      expect(content).toBe('🐺');
    });
  });

  describe('Sizes', () => {
    it('should render small size', () => {
      component.size = 'sm';
      fixture.detectChanges();
      const classes = divElement.nativeElement.className;
      expect(classes).toContain('w-8');
      expect(classes).toContain('h-8');
      expect(classes).toContain('text-lg');
    });

    it('should render medium size', () => {
      component.size = 'md';
      fixture.detectChanges();
      const classes = divElement.nativeElement.className;
      expect(classes).toContain('w-12');
      expect(classes).toContain('h-12');
      expect(classes).toContain('text-2xl');
    });

    it('should render large size', () => {
      component.size = 'lg';
      fixture.detectChanges();
      const classes = divElement.nativeElement.className;
      expect(classes).toContain('w-16');
      expect(classes).toContain('h-16');
      expect(classes).toContain('text-4xl');
    });
  });

  describe('Base styles', () => {
    it('should always include base classes', () => {
      const classes = divElement.nativeElement.className;
      expect(classes).toContain('flex');
      expect(classes).toContain('items-center');
      expect(classes).toContain('justify-center');
      expect(classes).toContain('rounded-full');
      expect(classes).toContain('bg-gray-100');
    });

    it('should maintain base classes across size changes', () => {
      component.size = 'sm';
      fixture.detectChanges();
      let classes = divElement.nativeElement.className;
      expect(classes).toContain('rounded-full');
      expect(classes).toContain('bg-gray-100');

      component.size = 'lg';
      fixture.detectChanges();
      classes = divElement.nativeElement.className;
      expect(classes).toContain('rounded-full');
      expect(classes).toContain('bg-gray-100');
    });
  });

  describe('Computed classes', () => {
    it('should update classes when size changes', () => {
      component.size = 'sm';
      fixture.detectChanges();
      let classes = divElement.nativeElement.className;
      expect(classes).toContain('w-8');
      expect(classes).toContain('h-8');

      component.size = 'lg';
      fixture.detectChanges();
      classes = divElement.nativeElement.className;
      expect(classes).toContain('w-16');
      expect(classes).toContain('h-16');
      expect(classes).not.toContain('w-8');
    });
  });

  describe('Computed emoji', () => {
    it('should update emoji when avatar changes', () => {
      component.avatar = 'elephant';
      fixture.detectChanges();
      let content = divElement.nativeElement.textContent.trim();
      expect(content).toBe('🐘');

      component.avatar = 'fox';
      fixture.detectChanges();
      content = divElement.nativeElement.textContent.trim();
      expect(content).toBe('🦊');

      component.avatar = 'wolf';
      fixture.detectChanges();
      content = divElement.nativeElement.textContent.trim();
      expect(content).toBe('🐺');
    });
  });

  describe('Integration tests', () => {
    it('should work with small elephant', () => {
      component.avatar = 'elephant';
      component.size = 'sm';
      fixture.detectChanges();

      const content = divElement.nativeElement.textContent.trim();
      const classes = divElement.nativeElement.className;

      expect(content).toBe('🐘');
      expect(classes).toContain('w-8');
      expect(classes).toContain('h-8');
      expect(classes).toContain('text-lg');
    });

    it('should work with large dolphin', () => {
      component.avatar = 'dolphin';
      component.size = 'lg';
      fixture.detectChanges();

      const content = divElement.nativeElement.textContent.trim();
      const classes = divElement.nativeElement.className;

      expect(content).toBe('🐬');
      expect(classes).toContain('w-16');
      expect(classes).toContain('h-16');
      expect(classes).toContain('text-4xl');
    });

    it('should handle multiple changes', () => {
      // Start with elephant medium
      component.avatar = 'elephant';
      component.size = 'md';
      fixture.detectChanges();
      expect(divElement.nativeElement.textContent.trim()).toBe('🐘');
      expect(divElement.nativeElement.className).toContain('w-12');

      // Change to fox large
      component.avatar = 'fox';
      component.size = 'lg';
      fixture.detectChanges();
      expect(divElement.nativeElement.textContent.trim()).toBe('🦊');
      expect(divElement.nativeElement.className).toContain('w-16');

      // Change to bear small
      component.avatar = 'bear';
      component.size = 'sm';
      fixture.detectChanges();
      expect(divElement.nativeElement.textContent.trim()).toBe('🐻');
      expect(divElement.nativeElement.className).toContain('w-8');
    });
  });

  describe('All animals with all sizes', () => {
    const animals: Array<'elephant' | 'dolphin' | 'fox' | 'owl' | 'bear' | 'wolf'> =
      ['elephant', 'dolphin', 'fox', 'owl', 'bear', 'wolf'];
    const sizes: Array<'sm' | 'md' | 'lg'> = ['sm', 'md', 'lg'];
    const emojis = {
      elephant: '🐘',
      dolphin: '🐬',
      fox: '🦊',
      owl: '🦉',
      bear: '🐻',
      wolf: '🐺'
    };

    animals.forEach(animal => {
      sizes.forEach(size => {
        it(`should render ${animal} with ${size} size correctly`, () => {
          component.avatar = animal;
          component.size = size;
          fixture.detectChanges();

          const content = divElement.nativeElement.textContent.trim();
          expect(content).toBe(emojis[animal]);

          const classes = divElement.nativeElement.className;
          expect(classes).toContain('rounded-full');
          expect(classes).toContain('bg-gray-100');
        });
      });
    });
  });
});
