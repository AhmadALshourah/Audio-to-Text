import { describe, it, expect } from 'vitest';
import { safeRedirectPath } from './safe-redirect.js';

describe('safeRedirectPath', () => {
  it('allows a normal relative path', () => {
    expect(safeRedirectPath('/en/dashboard', '/dashboard')).toBe('/en/dashboard');
  });

  it('falls back for null/empty input', () => {
    expect(safeRedirectPath(null, '/dashboard')).toBe('/dashboard');
    expect(safeRedirectPath('', '/dashboard')).toBe('/dashboard');
  });

  it('rejects protocol-relative URLs', () => {
    expect(safeRedirectPath('//evil.com', '/dashboard')).toBe('/dashboard');
  });

  it('rejects absolute external URLs', () => {
    expect(safeRedirectPath('https://evil.com', '/dashboard')).toBe('/dashboard');
    expect(safeRedirectPath('javascript:alert(1)', '/dashboard')).toBe('/dashboard');
  });

  it('rejects backslash-based bypasses of the protocol-relative check', () => {
    expect(safeRedirectPath('/\\evil.com', '/dashboard')).toBe('/dashboard');
  });

  it('rejects paths not starting with a single slash', () => {
    expect(safeRedirectPath('dashboard', '/dashboard')).toBe('/dashboard');
  });

  it('allows a relative path with a query string containing a colon', () => {
    expect(safeRedirectPath('/en/dashboard?tab=foo:bar', '/dashboard')).toBe(
      '/en/dashboard?tab=foo:bar',
    );
  });
});
