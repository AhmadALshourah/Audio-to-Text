import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Locale-aware Link/useRouter/usePathname/redirect — always keep the current
// locale prefix, so we never have to sprinkle `${locale}` through every href.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
