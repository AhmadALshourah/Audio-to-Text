import { cookies } from 'next/headers';
import { getUserByToken, UnauthorizedError, type User } from '@audio-to-text/core';
import { SESSION_COOKIE } from './session-cookie';

export { SESSION_COOKIE };

/** The signed-in user, or null. Safe to call in any server component. */
export async function getCurrentUser(): Promise<User | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return getUserByToken(token);
}

/** The signed-in user's id, or throw 401. Use in protected routes/pages. */
export async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user.id;
}
