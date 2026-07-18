import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PLAN_MONTHLY_MINUTES } from '@audio-to-text/shared/types';
import { getCurrentUser } from '@/lib/auth';
import { Reveal } from '@/components/reveal';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { Logo } from '@/components/logo';
import { HeroStudio } from '@/components/hero-studio';
import { Link } from '@/i18n/navigation';

export const runtime = 'nodejs';

/* ─────────────────────────── Shared bits ─────────────────────────── */

function PrimaryCta({
  signedIn,
  children,
  dashboardLabel,
}: {
  signedIn: boolean;
  children: React.ReactNode;
  dashboardLabel: string;
}) {
  return (
    <Link
      href={signedIn ? '/dashboard' : '/sign-up'}
      className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-contrast shadow-card transition-all hover:-translate-y-0.5 hover:bg-accent-dark"
    >
      {signedIn ? dashboardLabel : children}
    </Link>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="eyebrow">{children}</span>;
}

/* ─────────────────────────── Sections ─────────────────────────── */

async function Header({ signedIn }: { signedIn: boolean }) {
  const t = await getTranslations('nav');
  const tMeta = await getTranslations('metadata');
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/" aria-label={tMeta('siteName')}>
          <Logo label={tMeta('siteName')} />
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-ink/70 md:flex">
          <a href="#how-it-works" className="transition-colors hover:text-ink">
            {t('howItWorks')}
          </a>
          <a href="#pricing" className="transition-colors hover:text-ink">
            {t('pricing')}
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          {signedIn ? (
            <Link
              href="/dashboard"
              className="ms-1 inline-flex h-9 items-center rounded-full bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90"
            >
              {t('dashboard')}
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="ms-1 inline-flex h-9 items-center rounded-full border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-ink/40"
            >
              {t('signIn')}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

async function Hero({ signedIn }: { signedIn: boolean }) {
  const t = await getTranslations('hero');
  const tStudio = await getTranslations('heroStudio');

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-16 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24">
        <div>
          <Reveal>
            <Eyebrow>{t('eyebrow')}</Eyebrow>
          </Reveal>
          <Reveal delay={0.06}>
            <h1 className="mt-5 text-balance font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
              {t('titleLine1')}{' '}
              <span className="italic text-accent">{t('titleLine2')}</span>
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/70">{t('subtitle')}</p>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <PrimaryCta signedIn={signedIn} dashboardLabel={t('ctaOpenDashboard')}>
                {t('ctaStart')}
              </PrimaryCta>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-5 py-3 text-sm font-medium text-ink transition-colors hover:border-ink/40"
              >
                {t('seeHowItWorks')}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </a>
            </div>
          </Reveal>
          <Reveal delay={0.24}>
            <p className="mt-6 flex items-center gap-2 font-mono text-xs text-ink/55">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-accent" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {t('freeNote', { minutes: PLAN_MONTHLY_MINUTES.free })}
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.2}>
          <HeroStudio
            phrases={[tStudio('phrase1'), tStudio('phrase2'), tStudio('phrase3')]}
            liveLabel={tStudio('live')}
            listeningLabel={tStudio('listening')}
            fileLabel={tStudio('file')}
          />
        </Reveal>
      </div>
    </section>
  );
}

async function HowItWorks() {
  const t = await getTranslations('howItWorks');
  const steps = [
    { n: '01', title: t('step1Title'), body: t('step1Body') },
    { n: '02', title: t('step2Title'), body: t('step2Body') },
    { n: '03', title: t('step3Title'), body: t('step3Body') },
  ];

  return (
    <section id="how-it-works" className="border-t border-line bg-paper-soft/60">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <h2 className="mt-4 max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {t('heading')}
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
          {steps.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.08} className="bg-surface">
              <div className="flex h-full flex-col gap-3 p-7">
                <span className="font-mono text-sm font-medium text-accent">{step.n}</span>
                <h3 className="font-display text-xl font-semibold">{step.title}</h3>
                <p className="text-sm leading-relaxed text-ink/70">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURE_ICONS = [
  // Whisper / soundwave
  <path key="i" d="M4 12v0M8 8v8M12 5v14M16 8v8M20 12v0" />,
  // language / globe
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3z" />
  </>,
  // usage / gauge
  <>
    <path d="M12 13a5 5 0 0 1 8-4" />
    <path d="M12 13L8 9" />
    <path d="M4 18a9 9 0 0 1 16 0" />
  </>,
  // organized / layers
  <>
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 13l9 5 9-5" />
  </>,
  // export / download
  <>
    <path d="M12 4v10M8 11l4 4 4-4" />
    <path d="M5 19h14" />
  </>,
  // private / shield
  <path key="s" d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />,
];

async function Features() {
  const t = await getTranslations('features');
  const features = [1, 2, 3, 4, 5, 6].map((n, i) => ({
    title: t(`f${n}Title` as 'f1Title'),
    body: t(`f${n}Body` as 'f1Body'),
    icon: FEATURE_ICONS[i],
  }));

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <Reveal>
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h2 className="mt-4 max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {t('heading')}
        </h2>
      </Reveal>
      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 0.08}>
            <div className="group h-full rounded-2xl border border-line bg-surface p-6 transition-all hover:-translate-y-1 hover:border-accent/40 hover:shadow-card">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent-dark transition-colors group-hover:bg-accent group-hover:text-accent-contrast">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {f.icon}
                </svg>
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/70">{f.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

async function Pricing({ signedIn }: { signedIn: boolean }) {
  const t = await getTranslations('pricing');
  const features = [
    t('feature1', { minutes: PLAN_MONTHLY_MINUTES.free }),
    t('feature2'),
    t('feature3'),
    t('feature4'),
  ];

  return (
    <section id="pricing" className="border-y border-line bg-paper-soft/60">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <Reveal className="text-center">
          <div className="flex flex-col items-center">
            <Eyebrow>{t('eyebrow')}</Eyebrow>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {t('heading')}
            </h2>
            <p className="mt-2 text-ink/65">{t('subheading')}</p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mx-auto mt-12 max-w-md overflow-hidden rounded-4xl border border-line bg-surface shadow-float">
            <div className="border-b border-line p-8">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-xl font-semibold">{t('planName')}</h3>
                <span className="rounded-full bg-accent-soft px-3 py-1 font-mono text-xs font-medium uppercase tracking-wide text-accent-dark">
                  {t('planName')}
                </span>
              </div>
              <p className="mt-4 font-display text-5xl font-semibold tracking-tight">
                $0
                <span className="ms-1 align-baseline font-sans text-base font-normal text-ink/55">
                  {t('perMonth')}
                </span>
              </p>
            </div>
            <div className="p-8">
              <ul className="flex flex-col gap-3.5">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-ink/80">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-accent" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link
                  href={signedIn ? '/dashboard' : '/sign-up'}
                  className="flex w-full items-center justify-center rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-dark"
                >
                  {t('cta')}
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

async function FinalCta({ signedIn }: { signedIn: boolean }) {
  const t = await getTranslations('finalCta');
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-4xl border border-line bg-ink px-8 py-16 text-center sm:px-16">
          {/* faint waveform texture */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex h-24 items-end justify-center gap-1 opacity-10">
            {Array.from({ length: 60 }).map((_, i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-paper"
                style={{ height: `${20 + Math.abs(Math.sin(i * 0.9)) * 70}%` }}
              />
            ))}
          </div>
          <div className="relative">
            <span className="eyebrow justify-center text-paper/60 [&::before]:bg-accent">
              {t('eyebrow')}
            </span>
            <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-semibold tracking-tight text-paper sm:text-4xl">
              {t('heading')}
            </h2>
            <p className="mx-auto mt-4 max-w-md text-paper/70">
              {t('subtitle', { minutes: PLAN_MONTHLY_MINUTES.free })}
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                href={signedIn ? '/dashboard' : '/sign-up'}
                className="inline-flex items-center rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-accent-contrast transition-all hover:-translate-y-0.5 hover:bg-accent-dark"
              >
                {t('cta')}
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

async function Footer() {
  const tNav = await getTranslations('nav');
  const tFooter = await getTranslations('footer');
  const tMeta = await getTranslations('metadata');
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo label={tMeta('siteName')} />
          <p className="mt-3 max-w-xs text-sm text-ink/55">{tFooter('tagline')}</p>
        </div>
        <div className="flex flex-col gap-4 sm:items-end">
          <div className="flex flex-wrap gap-5 text-sm text-ink/60">
            <a href="#how-it-works" className="hover:text-ink">
              {tNav('howItWorks')}
            </a>
            <a href="#pricing" className="hover:text-ink">
              {tNav('pricing')}
            </a>
            <Link href="/privacy" className="hover:text-ink">
              {tNav('privacy')}
            </Link>
            <Link href="/terms" className="hover:text-ink">
              {tNav('terms')}
            </Link>
          </div>
          <p className="font-mono text-xs text-ink/45">
            {tFooter('copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────── Page ─────────────────────────── */

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

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
