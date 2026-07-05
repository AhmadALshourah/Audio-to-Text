import { openaiEnvSchema, databaseEnvSchema, appEnvSchema, parseEnv } from '@audio-to-text/shared';

/**
 * Server-side environment for the web app, validated once at module load.
 * Do NOT import this into Client Components — it contains secrets.
 */
const webEnvSchema = openaiEnvSchema.merge(databaseEnvSchema).merge(appEnvSchema);

export const env = parseEnv(webEnvSchema);
