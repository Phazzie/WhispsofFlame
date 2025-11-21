import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="avatarClasses()">
      {{ animalEmoji() }}
    </div>
  `,
  styles: []
})
export class AvatarComponent {
  @Input() avatar: 'elephant' | 'dolphin' | 'fox' | 'owl' | 'bear' | 'wolf' = 'elephant';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  animalEmoji = computed(() => {
    const map = {
      elephant: '🐘',
      dolphin: '🐬',
      fox: '🦊',
      owl: '🦉',
      bear: '🐻',
      wolf: '🐺'
    };
    return map[this.avatar];
  });

  avatarClasses = computed(() => {
    const base = 'flex items-center justify-center rounded-full bg-gray-100';
    const sizes = {
      sm: 'w-8 h-8 text-lg',
      md: 'w-12 h-12 text-2xl',
      lg: 'w-16 h-16 text-4xl'
    };
    return `${base} ${sizes[this.size]}`;
  });
}
