import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Audio-to-Text — Transcribe audio in seconds',
  description: 'Upload audio and get accurate transcripts powered by OpenAI Whisper.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
