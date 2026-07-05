import Image from 'next/image';
import Link from 'next/link';
import { PLAN_MONTHLY_MINUTES } from '@audio-to-text/shared/types';
import { getCurrentUser } from '@/lib/auth';
import { Reveal } from '@/components/reveal';
import heroWaveform from '../../public/images/hero-waveform.webp';

export const runtime = 'nodejs';

/* ─────────────────────────── Shared bits ─────────────────────────── */

function PrimaryCta({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={signedIn ? '/dashboard' : '/sign-up'}
      className="rounded-md bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-black"
    >
      {signedIn ? 'Open dashboard' : children}
    </Link>
  );
}

/* ─────────────────────────── Sections ─────────────────────────── */

function Header({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
      <span className="font-display text-sm font-semibold tracking-tight">Audio→Text</span>
      <nav className="flex items-center gap-5 text-sm">
        <a href="#how-it-works" className="text-ink/60 hover:text-ink">
          How it works
        </a>
        <a href="#pricing" className="text-ink/60 hover:text-ink">
          Pricing
        </a>
        {signedIn ? (
          <Link href="/dashboard" className="font-medium hover:underline">
            Dashboard
          </Link>
        ) : (
          <Link href="/sign-in" className="font-medium hover:underline">
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}

function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 pb-4 pt-16 text-center">
      <Reveal>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Turn audio into accurate text
          <span className="block text-accent">in seconds, not hours.</span>
        </h1>
      </Reveal>
      <Reveal delay={0.08}>
        <p className="max-w-xl text-lg text-ink/60">
          Drop in a recording — a meeting, a lecture, a voice note — and get a clean transcript
          powered by OpenAI Whisper. No installs, no manual typing, no waiting around.
        </p>
      </Reveal>
      <Reveal delay={0.16}>
        <div className="flex items-center gap-3">
          <PrimaryCta signedIn={signedIn}>Start transcribing — free</PrimaryCta>
          <a
            href="#how-it-works"
            className="px-4 py-3 text-sm font-medium text-ink/60 hover:text-ink"
          >
            See how it works ↓
          </a>
        </div>
      </Reveal>
      <Reveal delay={0.22}>
        <p className="text-xs text-ink/40">
          Free plan includes {PLAN_MONTHLY_MINUTES.free} minutes of audio every month. No credit
          card required.
        </p>
      </Reveal>

      <Reveal delay={0.3} className="mt-6 w-full">
        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-paper-soft shadow-[0_20px_60px_-25px_rgba(26,25,23,0.35)]">
          <Image
            src={heroWaveform}
            alt="Abstract sound waveform resolving into clean lines, representing audio becoming text"
            priority
            placeholder="blur"
            sizes="(max-width: 896px) 100vw, 896px"
            className="h-auto w-full"
          />
        </div>
      </Reveal>
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
    <section id="how-it-works" className="border-y border-ink/10 bg-paper-soft">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <Reveal>
          <h2 className="text-center font-display text-2xl font-semibold tracking-tight">
            How it works
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.08}>
              <div className="flex flex-col gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-paper">
                  {step.n}
                </span>
                <h3 className="font-medium">{step.title}</h3>
                <p className="text-sm text-ink/60">{step.body}</p>
              </div>
            </Reveal>
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
      <Reveal>
        <h2 className="text-center font-display text-2xl font-semibold tracking-tight">
          Everything you need. Nothing you don&apos;t.
        </h2>
      </Reveal>
      <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 0.08}>
            <div>
              <h3 className="font-medium">{f.title}</h3>
              <p className="mt-1 text-sm text-ink/60">{f.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Pricing({ signedIn }: { signedIn: boolean }) {
  return (
    <section id="pricing" className="border-y border-ink/10 bg-paper-soft">
      <div className="mx-auto max-w-md px-6 py-16">
        <Reveal>
          <h2 className="text-center font-display text-2xl font-semibold tracking-tight">
            Simple, honest pricing
          </h2>
          <p className="mt-2 text-center text-sm text-ink/60">
            No tiers, no credit card, no surprises.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-10 flex flex-col gap-4 rounded-xl border border-ink/10 bg-paper p-6 shadow-[0_20px_50px_-30px_rgba(26,25,23,0.4)]">
            <div>
              <h3 className="font-semibold">Free</h3>
              <p className="mt-1 text-3xl font-bold">
                $0<span className="text-sm font-normal text-ink/50"> / month</span>
              </p>
            </div>
            <ul className="flex flex-col gap-2 text-sm text-ink/60">
              <li>✓ {PLAN_MONTHLY_MINUTES.free} minutes of audio per month</li>
              <li>✓ All supported formats, files up to 25 MB</li>
              <li>✓ Full transcription history</li>
              <li>✓ Copy &amp; .txt export</li>
            </ul>
            <div className="mt-auto">
              <PrimaryCta signedIn={signedIn}>Get started free</PrimaryCta>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function FinalCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-6 py-20 text-center">
      <Reveal>
        <h2 className="font-display text-3xl font-semibold tracking-tight">
          Stop typing what you already said.
        </h2>
      </Reveal>
      <Reveal delay={0.08}>
        <p className="max-w-md text-ink/60">
          Your first {PLAN_MONTHLY_MINUTES.free} minutes are free every month — upload a file and
          see the transcript for yourself.
        </p>
      </Reveal>
      <Reveal delay={0.16}>
        <PrimaryCta signedIn={signedIn}>Start transcribing — free</PrimaryCta>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ink/10">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-ink/40 sm:flex-row">
        <span>© {new Date().getFullYear()} Audio→Text. Powered by OpenAI Whisper.</span>
        <div className="flex gap-4">
          <a href="#how-it-works" className="hover:text-ink/60">
            How it works
          </a>
          <a href="#pricing" className="hover:text-ink/60">
            Pricing
          </a>
          <Link href="/privacy" className="hover:text-ink/60">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-ink/60">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────── Page ─────────────────────────── */

export default async function HomePage() {
  const signedIn = Boolean(await getCurrentUser());
  return (
    <>
      <Header signedIn={signedIn} />
      <main>
        <Hero signedIn={signedIn} />
        <HowItWorks />
        <Features />
        <Pricing signedIn={signedIn} />
        <FinalCta signedIn={signedIn} />
      </main>
      <Footer />
    </>
  );
}
