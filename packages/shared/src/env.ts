import { z } from 'zod';

/**
 * Shared environment-variable schemas.
 *
 * Each app (web / worker) composes the fragments it needs and calls
 * `parseEnv` at startup so a missing/invalid variable fails fast with a
 * clear message instead of surfacing as a confusing runtime error later.
 */

export const openaiEnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
});

export const databaseEnvSchema = z.object({
  // SQLite file URL, e.g. file:./dev.db (not a network URL, so not .url()).
  DATABASE_URL: z.string().min(1),
});

export const appEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

/**
 * Validate `process.env` against a schema. Throws a readable error and exits
 * the process (in non-test envs) if validation fails.
 */
export function parseEnv<T extends z.ZodTypeAny>(
  schema: T,
  source: NodeJS.ProcessEnv = process.env,
): z.infer<T> {
  const result = schema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    // eslint-disable-next-line no-console
    console.error(`\n❌ Invalid environment variables:\n${issues}\n`);
    throw new Error('Environment validation failed');
  }

  return result.data;
}
