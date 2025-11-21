import { z } from 'zod';

/**
 * Task Contract v1.0
 * Breaking changes require version bump and migration
 */
export const TaskSchemaV1 = z.object({
  id: z.string().uuid(),
  sessionId: z.string().regex(/^[A-Z0-9]{6}$/),
  content: z.string().min(1).max(200),
  isSecret: z.boolean(),

  // FIXED: Track WHO voted, not just count
  votedBy: z.array(z.string().uuid()).max(10), // User IDs who clicked reveal

  status: z.enum(['active', 'done', 'archived']).default('active'),

  createdBy: z.string().uuid(), // User who created task
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  version: z.number().int().positive().default(1), // Optimistic concurrency
});

export type Task = z.infer<typeof TaskSchemaV1>;

// Derived computed property (not stored)
export const taskIsRevealed = (task: Task): boolean =>
  task.votedBy.length >= 2;
