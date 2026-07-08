import { routing } from '@/i18n/routing';

/**
 * Narrow an arbitrary request-body value to a supported locale, falling back
 * to the default. Used by API routes that build a locale-prefixed link (e.g.
 * a password-reset or email-verification email) from a client-supplied
 * locale, so an invalid value can't smuggle something unexpected into the URL.
 */
export function resolveLocale(value: unknown): (typeof routing.locales)[number] {
  return typeof value === 'string' && (routing.locales as readonly string[]).includes(value)
    ? (value as (typeof routing.locales)[number])
    : routing.defaultLocale;
}
