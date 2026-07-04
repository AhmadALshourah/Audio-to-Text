import {
  clerkEnvSchema,
  databaseEnvSchema,
  supabaseEnvSchema,
  redisEnvSchema,
  appEnvSchema,
  parseEnv,
} from '@audio-to-text/shared';

/**
 * Server-side environment for the web app, validated once at module load.
 * Do NOT import this into Client Components — it contains secrets.
 */
const webEnvSchema = clerkEnvSchema
  .merge(databaseEnvSchema)
  .merge(supabaseEnvSchema)
  .merge(redisEnvSchema)
  .merge(appEnvSchema);

export const env = parseEnv(webEnvSchema);
