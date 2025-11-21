export abstract class NavigationPort {
  abstract navigate(route: string[]): Promise<boolean>;
  abstract getCurrentUrl(): string;
}
