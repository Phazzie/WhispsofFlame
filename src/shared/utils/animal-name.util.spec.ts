import { generateAnimalName } from './animal-name.util';

describe('generateAnimalName', () => {
  it('should generate a valid display name', () => {
    const result = generateAnimalName();
    expect(result.displayName).toBeTruthy();
    expect(result.displayName).toMatch(/^\w+ \w+$/);
  });

  it('should generate a valid avatar', () => {
    const result = generateAnimalName();
    expect(result.avatar).toBeTruthy();
    expect(['elephant', 'dolphin', 'fox', 'owl', 'bear', 'wolf']).toContain(result.avatar);
  });

  it('should generate different names on multiple calls', () => {
    const names = new Set<string>();
    // Run 50 times to have a high probability of getting different names
    for (let i = 0; i < 50; i++) {
      names.add(generateAnimalName().displayName);
    }
    // With 10 adjectives and 10 animals, we should get more than 1 unique name
    expect(names.size).toBeGreaterThan(1);
  });

  it('should return an object with displayName and avatar properties', () => {
    const result = generateAnimalName();
    expect(result).toEqual(jasmine.objectContaining({
      displayName: jasmine.any(String),
      avatar: jasmine.any(String)
    }));
  });
});
