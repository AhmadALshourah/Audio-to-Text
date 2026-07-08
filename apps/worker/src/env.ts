import {
  openaiEnvSchema,
  databaseEnvSchema,
  appEnvSchema,
  uploadsEnvSchema,
  parseEnv,
} from '@audio-to-text/shared';

/**
 * Worker environment. Self-contained stack — it only needs the OpenAI key,
 * the SQLite database URL, and app config. No Redis, no cloud storage.
 */
const workerEnvSchema = openaiEnvSchema
  .merge(databaseEnvSchema)
  .merge(appEnvSchema)
  .merge(uploadsEnvSchema);

export const env = parseEnv(workerEnvSchema);
