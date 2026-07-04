'use client';

import { useState } from 'react';
import type { TranscriptionDTO } from '@/lib/serializers';
import { formatBytes, formatDate, formatDuration } from '@/lib/format';

const STATUS_STYLES: Record<TranscriptionDTO['status'], string> = {
  pending: 'bg-gray-100 text-gray-700',
  processing: 'bg-blue-100 text-blue-700',
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

export function TranscriptionItem({ item }: { item: TranscriptionDTO }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!item.text) return;
    await navigator.clipboard.writeText(item.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <li className="rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.fileName}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[item.status]}`}
          >
            {item.status}
          </span>
        </div>
        <span className="text-xs text-gray-400">{formatDate(item.createdAt)}</span>
      </div>

      <div className="mt-1 flex gap-3 text-xs text-gray-500">
        <span>{formatBytes(item.fileSizeBytes)}</span>
        <span>{formatDuration(item.durationSeconds)}</span>
        {item.costUsd !== null && <span>${item.costUsd.toFixed(4)}</span>}
      </div>

      {item.status === 'done' && item.text !== null && (
        <div className="mt-3">
          <p className="whitespace-pre-wrap text-sm text-gray-800">
            {item.text || '(no speech detected)'}
          </p>
          <div className="mt-2 flex gap-3 text-sm">
            <button onClick={handleCopy} className="font-medium text-black underline">
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={() => downloadText(item.fileName, item.text ?? '')}
              className="font-medium text-black underline"
            >
              Download .txt
            </button>
          </div>
        </div>
      )}

      {item.status === 'failed' && item.errorMessage && (
        <p className="mt-2 text-sm text-red-600">{item.errorMessage}</p>
      )}
    </li>
  );
}
