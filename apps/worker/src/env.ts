import { openaiEnvSchema, databaseEnvSchema, appEnvSchema, parseEnv } from '@audio-to-text/shared';

/**
 * Worker environment. Self-contained stack — it only needs the OpenAI key,
 * the SQLite database URL, and app config. No Redis, no cloud storage.
 */
const workerEnvSchema = openaiEnvSchema.merge(databaseEnvSchema).merge(appEnvSchema);

export const env = parseEnv(workerEnvSchema);
