import { NextResponse } from 'next/server';
import { getQuotaStatus } from '@audio-to-text/core';
import { requireUserId } from '@/lib/auth';
import { withErrorHandling } from '@/lib/api';

export const runtime = 'nodejs';

/** GET /api/usage — current billing-period quota status for the user. */
export const GET = withErrorHandling(async () => {
  const userId = await requireUserId();
  const status = await getQuotaStatus(userId);
  return NextResponse.json(status);
});
