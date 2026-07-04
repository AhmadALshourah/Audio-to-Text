import Link from 'next/link';
import { SignedIn, SignedOut } from '@clerk/nextjs';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Audio&nbsp;→&nbsp;Text</h1>
      <p className="max-w-md text-lg text-gray-600">
        Transcribe audio to text in seconds, powered by OpenAI Whisper.
      </p>

      <div className="flex gap-3">
        <SignedOut>
          <Link
            href="/sign-up"
            className="rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white"
          >
            Get started
          </Link>
          <Link
            href="/sign-in"
            className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium"
          >
            Sign in
          </Link>
        </SignedOut>
        <SignedIn>
          <Link
            href="/dashboard"
            className="rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white"
          >
            Go to dashboard
          </Link>
        </SignedIn>
      </div>
    </main>
  );
}
