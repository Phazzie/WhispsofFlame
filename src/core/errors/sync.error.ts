import { BaseError } from './base.error';

export class ConnectionError extends BaseError {
  constructor(message: string) {
    super(message, 'CONNECTION_ERROR');
  }
}

export class PublishError extends BaseError {
  constructor(message: string) {
    super(message, 'PUBLISH_ERROR');
  }
}
