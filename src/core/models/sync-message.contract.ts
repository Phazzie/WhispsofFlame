import { z } from 'zod';
import { TaskSchemaV1 } from './task.contract';

export const SyncMessageSchemaV1 = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('TASK_CREATED'),
    payload: TaskSchemaV1,
    timestamp: z.string().datetime(),
    userId: z.string().uuid(),
  }),
  z.object({
    type: z.literal('TASK_UPDATED'),
    payload: TaskSchemaV1,
    timestamp: z.string().datetime(),
    userId: z.string().uuid(),
  }),
  z.object({
    type: z.literal('TASK_DELETED'),
    payload: z.object({ id: z.string().uuid() }),
    timestamp: z.string().datetime(),
    userId: z.string().uuid(),
  }),
  z.object({
    type: z.literal('VOTE_REVEAL'),
    payload: z.object({
      taskId: z.string().uuid(),
      userId: z.string().uuid(),
    }),
    timestamp: z.string().datetime(),
    userId: z.string().uuid(),
  }),
]);

export type SyncMessage = z.infer<typeof SyncMessageSchemaV1>;
