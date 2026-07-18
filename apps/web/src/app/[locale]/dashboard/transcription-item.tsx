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
  pending: 'bg-paper-soft text-ink/60',
  processing: 'bg-accent-soft text-accent-dark',
  done: 'bg-ok-soft text-ok',
  failed: 'bg-danger-soft text-danger',
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

const actionClass =
  'rounded-full border border-line px-3 py-1 font-medium text-ink/75 transition-colors hover:border-accent/50 hover:text-accent-dark';

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
    <li className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="truncate font-medium">{item.fileName}</span>
          <span
            className={`rounded-full px-2.5 py-0.5 font-mono text-[0.7rem] font-medium uppercase tracking-wide ${STATUS_STYLES[item.status]}`}
          >
            {item.status}
          </span>
        </div>
        <span className="font-mono text-xs text-ink/45">{formatDate(item.createdAt)}</span>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-ink/55">
        <span>{formatBytes(item.fileSizeBytes)}</span>
        <span>{formatDuration(item.durationSeconds)}</span>
        {item.costUsd !== null && <span>${item.costUsd.toFixed(4)}</span>}
      </div>

      {item.status === 'done' && item.text !== null && (
        <div className="mt-4">
          <div className="max-h-56 overflow-y-auto rounded-xl border border-line bg-paper-soft/50 p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/85">
              {item.text || t('noSpeechDetected')}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <button onClick={handleCopy} className={actionClass}>
              {copied ? t('copied') : t('copy')}
            </button>
            <button onClick={() => downloadText(item.fileName, item.text ?? '')} className={actionClass}>
              {t('downloadTxt')}
            </button>
            <button onClick={() => downloadSubtitles(item.id, 'srt')} className={actionClass}>
              .srt
            </button>
            <button onClick={() => downloadSubtitles(item.id, 'vtt')} className={actionClass}>
              .vtt
            </button>
          </div>
        </div>
      )}

      {item.status === 'failed' && item.errorMessage && (
        <p className="mt-2 text-sm text-danger">{item.errorMessage}</p>
      )}

      {(item.status === 'pending' || item.status === 'processing') && pollNotice && (
        <p className="mt-2 text-sm text-warn">{t(POLL_NOTICE_KEYS[pollNotice])}</p>
      )}
    </li>
  );
}
