import { z } from 'zod';
import { openaiEnvSchema, databaseEnvSchema, appEnvSchema, parseEnv } from '@audio-to-text/shared';

/**
 * Worker environment.
 *
 * BullMQ needs a native Redis (TCP/TLS) connection, so the worker expects a
 * `REDIS_URL` (rediss://...) — this is different from the Upstash REST
 * credentials used by the web app. See README "Redis" note.
 */
const workerEnvSchema = openaiEnvSchema
  .merge(databaseEnvSchema)
  .merge(appEnvSchema)
  .merge(
    z.object({
      REDIS_URL: z.string().url().startsWith('rediss://').or(z.string().startsWith('redis://')),
    }),
  );

export const env = parseEnv(workerEnvSchema);
