import { Component, Input, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <input
      [type]="type"
      [placeholder]="placeholder"
      [maxLength]="maxLength"
      [(ngModel)]="value"
      class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  `,
  styles: []
})
export class InputComponent {
  @Input() placeholder = '';
  @Input() type = 'text';
  @Input() maxLength: number | undefined;

  value = model<string>('');
}
