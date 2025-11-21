import { BaseError } from './base.error';

export class ValidationError extends BaseError {
  constructor(message: string, public issues: unknown[]) {
    super(message, 'VALIDATION_ERROR');
  }
}
