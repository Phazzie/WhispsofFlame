import { z } from 'zod';

export const UserSchemaV1 = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1).max(50), // e.g., "Happy Elephant"
  avatar: z.enum(['elephant', 'dolphin', 'fox', 'owl', 'bear', 'wolf']),
  createdAt: z.string().datetime(),
  isGuest: z.boolean().default(true),
});

export type User = z.infer<typeof UserSchemaV1>;
