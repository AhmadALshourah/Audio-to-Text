import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PLAN_MONTHLY_MINUTES } from '@audio-to-text/shared/types';
import { getCurrentUser } from '@/lib/auth';
import { Reveal } from '@/components/reveal';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Link } from '@/i18n/navigation';
import heroWaveform from '../../../public/images/hero-waveform.webp';

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
      className="rounded-md bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-black"
    >
      {signedIn ? dashboardLabel : children}
    </Link>
  );
}

/* ─────────────────────────── Sections ─────────────────────────── */

async function Header({ signedIn }: { signedIn: boolean }) {
  const t = await getTranslations('nav');
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
      <span className="font-display text-sm font-semibold tracking-tight" dir="ltr">
        Audio→Text
      </span>
      <nav className="flex items-center gap-5 text-sm">
        <a href="#how-it-works" className="text-ink/60 hover:text-ink">
          {t('howItWorks')}
        </a>
        <a href="#pricing" className="text-ink/60 hover:text-ink">
          {t('pricing')}
        </a>
        {signedIn ? (
          <Link href="/dashboard" className="font-medium hover:underline">
            {t('dashboard')}
          </Link>
        ) : (
          <Link href="/sign-in" className="font-medium hover:underline">
            {t('signIn')}
          </Link>
        )}
        <LocaleSwitcher />
      </nav>
    </header>
  );
}

async function Hero({ signedIn }: { signedIn: boolean }) {
  const t = await getTranslations('hero');
  return (
    <section className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 pb-4 pt-16 text-center">
      <Reveal>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {t('titleLine1')}
          <span className="block text-accent">{t('titleLine2')}</span>
        </h1>
      </Reveal>
      <Reveal delay={0.08}>
        <p className="max-w-xl text-lg text-ink/60">{t('subtitle')}</p>
      </Reveal>
      <Reveal delay={0.16}>
        <div className="flex items-center gap-3">
          <PrimaryCta signedIn={signedIn} dashboardLabel={t('ctaOpenDashboard')}>
            {t('ctaStart')}
          </PrimaryCta>
          <a
            href="#how-it-works"
            className="px-4 py-3 text-sm font-medium text-ink/60 hover:text-ink"
          >
            {t('seeHowItWorks')}
          </a>
        </div>
      </Reveal>
      <Reveal delay={0.22}>
        <p className="text-xs text-ink/65">
          {t('freeNote', { minutes: PLAN_MONTHLY_MINUTES.free })}
        </p>
      </Reveal>

      <Reveal delay={0.3} className="mt-6 w-full">
        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-paper-soft shadow-[0_20px_60px_-25px_rgba(26,25,23,0.35)]">
          <Image
            src={heroWaveform}
            alt={t('imageAlt')}
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

async function HowItWorks() {
  const t = await getTranslations('howItWorks');
  const steps = [
    { n: '1', title: t('step1Title'), body: t('step1Body') },
    { n: '2', title: t('step2Title'), body: t('step2Body') },
    { n: '3', title: t('step3Title'), body: t('step3Body') },
  ];

  return (
    <section id="how-it-works" className="border-y border-ink/10 bg-paper-soft">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <Reveal>
          <h2 className="text-center font-display text-2xl font-semibold tracking-tight">
            {t('heading')}
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {steps.map((step, i) => (
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

async function Features() {
  const t = await getTranslations('features');
  const features = [1, 2, 3, 4, 5, 6].map((n) => ({
    title: t(`f${n}Title` as 'f1Title'),
    body: t(`f${n}Body` as 'f1Body'),
  }));

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <Reveal>
        <h2 className="text-center font-display text-2xl font-semibold tracking-tight">
          {t('heading')}
        </h2>
      </Reveal>
      <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
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

async function Pricing({ signedIn }: { signedIn: boolean }) {
  const t = await getTranslations('pricing');
  return (
    <section id="pricing" className="border-y border-ink/10 bg-paper-soft">
      <div className="mx-auto max-w-md px-6 py-16">
        <Reveal>
          <h2 className="text-center font-display text-2xl font-semibold tracking-tight">
            {t('heading')}
          </h2>
          <p className="mt-2 text-center text-sm text-ink/60">{t('subheading')}</p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-10 flex flex-col gap-4 rounded-xl border border-ink/10 bg-paper p-6 shadow-[0_20px_50px_-30px_rgba(26,25,23,0.4)]">
            <div>
              <h3 className="font-semibold">{t('planName')}</h3>
              <p className="mt-1 text-3xl font-bold">
                $0<span className="text-sm font-normal text-ink/70"> {t('perMonth')}</span>
              </p>
            </div>
            <ul className="flex flex-col gap-2 text-sm text-ink/60">
              <li>✓ {t('feature1', { minutes: PLAN_MONTHLY_MINUTES.free })}</li>
              <li>✓ {t('feature2')}</li>
              <li>✓ {t('feature3')}</li>
              <li>✓ {t('feature4')}</li>
            </ul>
            <div className="mt-auto">
              <PrimaryCta signedIn={signedIn} dashboardLabel={t('cta')}>
                {t('cta')}
              </PrimaryCta>
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
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-6 py-20 text-center">
      <Reveal>
        <h2 className="font-display text-3xl font-semibold tracking-tight">{t('heading')}</h2>
      </Reveal>
      <Reveal delay={0.08}>
        <p className="max-w-md text-ink/60">
          {t('subtitle', { minutes: PLAN_MONTHLY_MINUTES.free })}
        </p>
      </Reveal>
      <Reveal delay={0.16}>
        <PrimaryCta signedIn={signedIn} dashboardLabel={t('cta')}>
          {t('cta')}
        </PrimaryCta>
      </Reveal>
    </section>
  );
}

async function Footer() {
  const tNav = await getTranslations('nav');
  const tFooter = await getTranslations('footer');
  return (
    <footer className="border-t border-ink/10">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-ink/65 sm:flex-row">
        <span>{tFooter('copyright', { year: new Date().getFullYear() })}</span>
        <div className="flex gap-4">
          <a href="#how-it-works" className="hover:text-ink/60">
            {tNav('howItWorks')}
          </a>
          <a href="#pricing" className="hover:text-ink/60">
            {tNav('pricing')}
          </a>
          <Link href="/privacy" className="hover:text-ink/60">
            {tNav('privacy')}
          </Link>
          <Link href="/terms" className="hover:text-ink/60">
            {tNav('terms')}
          </Link>
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
