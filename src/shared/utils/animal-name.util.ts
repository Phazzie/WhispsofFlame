const ADJECTIVES = ['Happy', 'Brave', 'Swift', 'Wise', 'Gentle', 'Bold', 'Calm', 'Clever', 'Eager', 'Fierce'];
const ANIMALS = ['Elephant', 'Dolphin', 'Fox', 'Owl', 'Bear', 'Wolf', 'Tiger', 'Eagle', 'Lion', 'Hawk'];
const AVATARS = ['elephant', 'dolphin', 'fox', 'owl', 'bear', 'wolf'] as const;

export function generateAnimalName(): { displayName: string; avatar: typeof AVATARS[number] } {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  return { displayName: `${adj} ${animal}`, avatar };
}
