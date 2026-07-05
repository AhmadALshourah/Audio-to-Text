import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Audio→Text — Turn audio into accurate text in seconds',
    template: '%s · Audio→Text',
  },
  description:
    'Upload a recording and get a clean, accurate transcript powered by OpenAI Whisper. Free plan with 30 minutes of audio every month — no credit card required.',
  keywords: [
    'audio to text',
    'transcription',
    'speech to text',
    'whisper',
    'transcribe audio',
    'meeting transcription',
  ],
  openGraph: {
    type: 'website',
    url: APP_URL,
    siteName: 'Audio→Text',
    title: 'Audio→Text — Turn audio into accurate text in seconds',
    description:
      'Drop in a recording and get a clean transcript powered by OpenAI Whisper. Free plan included.',
  },
  twitter: {
    card: 'summary',
    title: 'Audio→Text — Turn audio into accurate text in seconds',
    description:
      'Drop in a recording and get a clean transcript powered by OpenAI Whisper. Free plan included.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body>{children}</body>
    </html>
  );
}
