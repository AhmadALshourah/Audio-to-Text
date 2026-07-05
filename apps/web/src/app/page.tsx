import Link from 'next/link';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { PLAN_MONTHLY_MINUTES } from '@audio-to-text/shared/types';

/* ─────────────────────────── Shared bits ─────────────────────────── */

function PrimaryCta({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedOut>
        <Link
          href="/sign-up"
          className="rounded-md bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          {children}
        </Link>
      </SignedOut>
      <SignedIn>
        <Link
          href="/dashboard"
          className="rounded-md bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          Open dashboard
        </Link>
      </SignedIn>
    </>
  );
}

/* ─────────────────────────── Sections ─────────────────────────── */

function Header() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
      <span className="text-sm font-semibold tracking-tight">Audio→Text</span>
      <nav className="flex items-center gap-5 text-sm">
        <a href="#how-it-works" className="text-gray-600 hover:text-black">
          How it works
        </a>
        <a href="#pricing" className="text-gray-600 hover:text-black">
          Pricing
        </a>
        <SignedOut>
          <Link href="/sign-in" className="font-medium hover:underline">
            Sign in
          </Link>
        </SignedOut>
        <SignedIn>
          <Link href="/dashboard" className="font-medium hover:underline">
            Dashboard
          </Link>
        </SignedIn>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 pb-20 pt-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Turn audio into accurate text
        <span className="block text-gray-400">in seconds, not hours.</span>
      </h1>
      <p className="max-w-xl text-lg text-gray-600">
        Drop in a recording — a meeting, a lecture, a voice note — and get a clean transcript
        powered by OpenAI Whisper. No installs, no manual typing, no waiting around.
      </p>
      <div className="flex items-center gap-3">
        <PrimaryCta>Start transcribing — free</PrimaryCta>
        <a
          href="#how-it-works"
          className="px-4 py-3 text-sm font-medium text-gray-600 hover:text-black"
        >
          See how it works ↓
        </a>
      </div>
      <p className="text-xs text-gray-400">
        Free plan includes {PLAN_MONTHLY_MINUTES.free} minutes of audio every month. No credit card
        required.
      </p>
    </section>
  );
}

const STEPS = [
  {
    n: '1',
    title: 'Upload your audio',
    body: 'Drag & drop any common format — mp3, wav, m4a, flac, ogg and more. Files up to 25 MB.',
  },
  {
    n: '2',
    title: 'Whisper transcribes it',
    body: 'State-of-the-art speech recognition handles accents, background noise, and dozens of languages.',
  },
  {
    n: '3',
    title: 'Copy or download the text',
    body: 'Your transcript is ready in seconds. Copy it to the clipboard or download it as a .txt file.',
  },
] as const;

function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-gray-100 bg-gray-50">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight">How it works</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="flex flex-col gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
                {step.n}
              </span>
              <h3 className="font-medium">{step.title}</h3>
              <p className="text-sm text-gray-600">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    title: 'Built on OpenAI Whisper',
    body: 'The same model trusted across the industry for near-human transcription accuracy.',
  },
  {
    title: 'Any language, any accent',
    body: 'Whisper was trained on 680,000 hours of multilingual audio. Speak how you speak.',
  },
  {
    title: 'Know your usage',
    body: 'A clear monthly minute counter — see exactly what you have used and what is left.',
  },
  {
    title: 'Your transcripts, organized',
    body: 'Every transcription is saved to your private history, searchable whenever you need it.',
  },
  {
    title: 'Export instantly',
    body: 'One-click copy to clipboard, or download transcripts as plain .txt files.',
  },
  {
    title: 'Private by design',
    body: 'Your files are processed for transcription only — never used to train models.',
  },
] as const;

function Features() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="text-center text-2xl font-semibold tracking-tight">
        Everything you need. Nothing you don&apos;t.
      </h2>
      <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title}>
            <h3 className="font-medium">{f.title}</h3>
            <p className="mt-1 text-sm text-gray-600">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="border-y border-gray-100 bg-gray-50">
      <div className="mx-auto max-w-md px-6 py-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight">
          Simple, honest pricing
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          No tiers, no credit card, no surprises.
        </p>

        <div className="mt-10 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6">
          <div>
            <h3 className="font-semibold">Free</h3>
            <p className="mt-1 text-3xl font-bold">
              $0<span className="text-sm font-normal text-gray-500"> / month</span>
            </p>
          </div>
          <ul className="flex flex-col gap-2 text-sm text-gray-600">
            <li>✓ {PLAN_MONTHLY_MINUTES.free} minutes of audio per month</li>
            <li>✓ All supported formats, files up to 25 MB</li>
            <li>✓ Full transcription history</li>
            <li>✓ Copy &amp; .txt export</li>
          </ul>
          <div className="mt-auto">
            <PrimaryCta>Get started free</PrimaryCta>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-6 py-20 text-center">
      <h2 className="text-3xl font-bold tracking-tight">Stop typing what you already said.</h2>
      <p className="max-w-md text-gray-600">
        Your first {PLAN_MONTHLY_MINUTES.free} minutes are free every month — upload a file and see
        the transcript for yourself.
      </p>
      <PrimaryCta>Start transcribing — free</PrimaryCta>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-100">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-gray-400 sm:flex-row">
        <span>© {new Date().getFullYear()} Audio→Text. Powered by OpenAI Whisper.</span>
        <div className="flex gap-4">
          <a href="#how-it-works" className="hover:text-gray-600">
            How it works
          </a>
          <a href="#pricing" className="hover:text-gray-600">
            Pricing
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────── Page ─────────────────────────── */

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <Pricing />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
