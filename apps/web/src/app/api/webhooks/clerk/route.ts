import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import type { WebhookEvent } from '@clerk/nextjs/server';
import { upsertUserFromClerk, deleteUserByClerkId } from '@audio-to-text/core';
import { env } from '@/env';

export const runtime = 'nodejs';

/**
 * Clerk webhook. Verifies the svix signature, then keeps our User table in
 * sync with Clerk. Note: in local dev Clerk can't reach localhost, so this is
 * primarily a production path — `requireUserId` also provisions users lazily.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const body = await req.text();

  let evt: WebhookEvent;
  try {
    const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (evt.type) {
    case 'user.created':
    case 'user.updated': {
      const { id, email_addresses, first_name, last_name } = evt.data;
      const primary =
        email_addresses.find((e) => e.id === evt.data.primary_email_address_id) ??
        email_addresses[0];
      const name = [first_name, last_name].filter(Boolean).join(' ') || null;

      if (primary?.email_address) {
        await upsertUserFromClerk({ clerkId: id, email: primary.email_address, name });
      }
      break;
    }
    case 'user.deleted': {
      if (evt.data.id) {
        await deleteUserByClerkId(evt.data.id);
      }
      break;
    }
    default:
      // Ignore other event types.
      break;
  }

  return NextResponse.json({ received: true });
}
