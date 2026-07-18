/** Cookie that persists the user's chosen theme. Read server-side in the root
 *  layout so the correct `dark` class is rendered into `<html>` from the first
 *  byte — which is what lets the theme survive a locale switch (that remounts
 *  the layout) instead of being wiped. */
export const THEME_COOKIE = 'theme';
export type Theme = 'light' | 'dark';
