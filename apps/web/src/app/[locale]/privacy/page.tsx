import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { LegalPage } from '@/components/legal-page';
import { PLAN_MONTHLY_MINUTES, MAX_TRANSCRIPTION_ATTEMPTS } from '@audio-to-text/shared/types';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Tadween collects, uses, and deletes your data.',
};

// TODO: replace with your real support address before a public launch.
const SUPPORT_EMAIL = 'support@tadween.app';

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LegalPage title="Privacy Policy" lastUpdated="July 2026">
      <p>
        Tadween (&quot;we&quot;, &quot;the service&quot;) transcribes audio you upload into text.
        This page explains what data we collect, why, and — most importantly — what happens to your
        audio files.
      </p>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account data:</strong> the email address and (optional) name you sign up with,
            and a password hash — never your plaintext password.
          </li>
          <li>
            <strong>Audio you upload:</strong> the file itself, temporarily, and metadata like file
            name, size, and duration.
          </li>
          <li>
            <strong>Transcripts:</strong> the text Whisper returns for your audio.
          </li>
          <li>
            <strong>Usage:</strong> how many seconds of audio you&apos;ve transcribed this month, to
            enforce the free plan&apos;s {PLAN_MONTHLY_MINUTES.free}-minute limit.
          </li>
        </ul>
      </section>

      <section>
        <h2>Your audio is deleted after processing</h2>
        <p>
          Uploaded audio is written to temporary storage, sent to OpenAI&apos;s Whisper API for
          transcription, and then <strong>deleted immediately</strong> once transcription succeeds
          or permanently fails (after {MAX_TRANSCRIPTION_ATTEMPTS} attempts). We do not keep a copy
          of your audio — only the resulting text is stored, tied to your account.
        </p>
      </section>

      <section>
        <h2>Third parties</h2>
        <p>
          Transcription is performed by{' '}
          <a href="https://openai.com/policies" target="_blank" rel="noreferrer">
            OpenAI
          </a>{' '}
          via their Whisper API — this is the only third party your audio is ever sent to. As of
          this writing, OpenAI&apos;s API terms state that data submitted through the API is not
          used to train their models and is retained only briefly for abuse monitoring; we encourage
          you to review OpenAI&apos;s current policy directly, since it can change independently of
          this page.
        </p>
        <p>
          We do not use any third-party analytics, advertising, or tracking services. There is no
          payment processor, because the service is currently free-only.
        </p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          We set exactly one cookie: a session token that keeps you signed in. It is functional only
          — not used for tracking or advertising — and is marked httpOnly, so client-side scripts
          can&apos;t read it.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          You can delete your account at any time from the dashboard. This permanently removes your
          account, transcription history, and usage records, and deletes any audio still being
          processed. You can also email us at {SUPPORT_EMAIL} to request a copy of your data or ask
          questions about this policy.
        </p>
      </section>

      <section>
        <h2>Consent</h2>
        <p>
          By uploading a file, you confirm you have the right to do so — for example, that you have
          permission from anyone else recorded in it — and you consent to that audio being processed
          by OpenAI&apos;s Whisper API as described above.
        </p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>
          If this policy changes materially, we&apos;ll update the date at the top of this page.
        </p>
      </section>
    </LegalPage>
  );
}
