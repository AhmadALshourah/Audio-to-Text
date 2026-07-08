'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { TranscriptionDTO } from '@/lib/serializers';
import { formatBytes, formatDate, formatDuration } from '@/lib/format';
import type { PollNotice } from './dashboard-client';

const POLL_NOTICE_KEYS: Record<PollNotice, string> = {
  auth: 'pollNoticeAuth',
  network: 'pollNoticeNetwork',
  timeout: 'pollNoticeTimeout',
};

const STATUS_STYLES: Record<TranscriptionDTO['status'], string> = {
  pending: 'bg-ink/10 text-ink/70',
  processing: 'bg-accent-soft text-accent-dark',
  done: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

function downloadText(fileName: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName.replace(/\.[^/.]+$/, '')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Navigate to the subtitles API route; the server sets Content-Disposition
 * so the browser downloads it (cookies are sent automatically, same-origin). */
function downloadSubtitles(id: string, format: 'srt' | 'vtt') {
  const a = document.createElement('a');
  a.href = `/api/transcriptions/${id}/subtitles?format=${format}`;
  a.click();
}

interface TranscriptionItemProps {
  item: TranscriptionDTO;
  /** Set when polling for this (still in-flight) item stopped without ever
   * reaching a final status — a session/network error, or a 3-minute
   * timeout. Only meaningful while status is still pending/processing. */
  pollNotice?: PollNotice;
}

export function TranscriptionItem({ item, pollNotice }: TranscriptionItemProps) {
  const t = useTranslations('dashboard');
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!item.text) return;
    await navigator.clipboard.writeText(item.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <li className="rounded-lg border border-ink/10 bg-paper p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.fileName}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[item.status]}`}
          >
            {item.status}
          </span>
        </div>
        <span className="text-xs text-ink/65">{formatDate(item.createdAt)}</span>
      </div>

      <div className="mt-1 flex gap-3 text-xs text-ink/70">
        <span>{formatBytes(item.fileSizeBytes)}</span>
        <span>{formatDuration(item.durationSeconds)}</span>
        {item.costUsd !== null && <span>${item.costUsd.toFixed(4)}</span>}
      </div>

      {item.status === 'done' && item.text !== null && (
        <div className="mt-3">
          <p className="whitespace-pre-wrap text-sm text-ink/80">
            {item.text || t('noSpeechDetected')}
          </p>
          <div className="mt-2 flex gap-3 text-sm">
            <button onClick={handleCopy} className="font-medium text-accent-dark underline">
              {copied ? t('copied') : t('copy')}
            </button>
            <button
              onClick={() => downloadText(item.fileName, item.text ?? '')}
              className="font-medium text-accent-dark underline"
            >
              {t('downloadTxt')}
            </button>
            <button
              onClick={() => downloadSubtitles(item.id, 'srt')}
              className="font-medium text-accent-dark underline"
            >
              .srt
            </button>
            <button
              onClick={() => downloadSubtitles(item.id, 'vtt')}
              className="font-medium text-accent-dark underline"
            >
              .vtt
            </button>
          </div>
        </div>
      )}

      {item.status === 'failed' && item.errorMessage && (
        <p className="mt-2 text-sm text-red-600">{item.errorMessage}</p>
      )}

      {(item.status === 'pending' || item.status === 'processing') && pollNotice && (
        <p className="mt-2 text-sm text-amber-700">{t(POLL_NOTICE_KEYS[pollNotice])}</p>
      )}
    </li>
  );
}
