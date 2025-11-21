import { z } from 'zod';

export const SessionSchemaV1 = z.object({
  id: z.string().regex(/^[A-Z0-9]{6}$/),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(), // Auto-delete after 7 days
  participantIds: z.array(z.string().uuid()).max(20),
});

export type Session = z.infer<typeof SessionSchemaV1>;
