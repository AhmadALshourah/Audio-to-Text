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

/**
 * Resend — the second (and only other) external dependency, used solely for
 * transactional email (password reset, email verification). Only the web app
 * sends email, so this is not merged into the worker's env schema.
 */
export const resendEnvSchema = z.object({
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  EMAIL_FROM: z.string().min(1, 'EMAIL_FROM is required'),
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
 * POSIX absolute (`/…`), Windows drive-letter (`C:\…` or `C:/…`), or UNC
 * (`\\server\share`). Deliberately not `node:path`'s `isAbsolute` — this
 * schema needs to stay loadable outside Node (e.g. Next.js Edge middleware,
 * which fails to bundle `node:path`).
 */
function isAbsolutePath(value: string): boolean {
  return /^(\/|[a-zA-Z]:[\\/]|\\\\)/.test(value);
}

/**
 * Required (no default) and must be absolute: web and worker run as separate
 * processes, so a relative path would resolve against whatever each
 * process's cwd happens to be and silently diverge between them.
 */
export const uploadsEnvSchema = z.object({
  UPLOADS_DIR: z
    .string()
    .min(1, 'UPLOADS_DIR is required')
    .refine(isAbsolutePath, 'UPLOADS_DIR must be an absolute path'),
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
