import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationPort } from '../../core/ports/navigation.port';

@Injectable()
export class AngularRouterAdapter extends NavigationPort {
  constructor(private router: Router) {
    super();
  }

  async navigate(route: string[]): Promise<boolean> {
    return this.router.navigate(route);
  }

  getCurrentUrl(): string {
    return this.router.url;
  }
}
