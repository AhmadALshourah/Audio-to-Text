import { describe, it, expect, vi, afterEach } from 'vitest';
import path from 'node:path';

vi.mock('@audio-to-text/shared/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Wrap `unlink`/`statfs` in mocks that call through to the real
// implementation by default, so every test but the ones below still hits the
// real filesystem.
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return { ...actual, unlink: vi.fn(actual.unlink), statfs: vi.fn(actual.statfs) };
});

import { unlink, statfs } from 'node:fs/promises';
import { logger } from '@audio-to-text/shared/logger';
import { saveAudio, readAudio, deleteAudio } from './storage.js';
import { ValidationError } from './errors.js';

const mockLoggerError = vi.mocked(logger.error);
const mockUnlink = vi.mocked(unlink);
const mockStatfs = vi.mocked(statfs);

describe('storage', () => {
  afterEach(() => {
    mockLoggerError.mockClear();
    mockUnlink.mockClear();
    mockStatfs.mockClear();
  });

  it('writes and reads back the same audio bytes', async () => {
    const data = Buffer.from('fake audio bytes');
    const filePath = await saveAudio('storage-test-id', 'wav', data);

    expect(path.basename(filePath)).toBe('storage-test-id.wav');
    await expect(readAudio(filePath)).resolves.toEqual(data);

    await deleteAudio(filePath);
  });

  it('rejects an upload when statfs reports too little free space', async () => {
    mockStatfs.mockResolvedValueOnce({
      bavail: 1,
      bsize: 1, // 1 free byte — far below any MIN_FREE_BYTES_MARGIN
    } as Awaited<ReturnType<typeof statfs>>);

    await expect(
      saveAudio('storage-test-low-space', 'wav', Buffer.from('some audio bytes')),
    ).rejects.toThrow(ValidationError);
  });

  it('does not block the upload if the disk-space check itself fails', async () => {
    mockStatfs.mockRejectedValueOnce(new Error('statfs not supported on this platform'));

    const filePath = await saveAudio(
      'storage-test-statfs-unsupported',
      'wav',
      Buffer.from('some audio bytes'),
    );
    await deleteAudio(filePath);
  });

  it('silently no-ops deleting a file that does not exist', async () => {
    await expect(deleteAudio('/no/such/path/does-not-exist.wav')).resolves.toBeUndefined();
    expect(mockLoggerError).not.toHaveBeenCalled();
  });

  it('does not throw on a real filesystem error, but logs it', async () => {
    const eperm = Object.assign(new Error('permission denied'), { code: 'EPERM' });
    mockUnlink.mockRejectedValueOnce(eperm);

    await expect(deleteAudio('/some/locked/file.wav')).resolves.toBeUndefined();
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Failed to delete audio file',
      expect.objectContaining({ filePath: '/some/locked/file.wav' }),
    );
  });

  it('does nothing for a null/undefined path', async () => {
    await expect(deleteAudio(null)).resolves.toBeUndefined();
    await expect(deleteAudio(undefined)).resolves.toBeUndefined();
    expect(mockLoggerError).not.toHaveBeenCalled();
  });
});
