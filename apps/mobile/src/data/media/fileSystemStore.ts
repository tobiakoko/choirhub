// expo-file-system implementation of the MediaStore port (system design §6.2:
// "Resumable range requests"). Renditions are written under a dedicated `media/`
// directory inside documentDirectory. Downloads use a DownloadResumable so a
// dropped 2G connection resumes from the partial file instead of restarting.
//
// The legacy API (`expo-file-system/legacy`) is used deliberately: DownloadResumable
// with pause/resume lives there, and it exposes the byte-accurate FileInfo the LRU
// budgets against.

import * as FileSystem from 'expo-file-system/legacy';

import type { MediaStore, StoredFile } from './types';

const MEDIA_DIR = `${FileSystem.documentDirectory ?? ''}media/`;

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(MEDIA_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MEDIA_DIR, { intermediates: true });
  }
}

function uriFor(key: string): string {
  return `${MEDIA_DIR}${key}`;
}

async function info(key: string): Promise<StoredFile> {
  const uri = uriFor(key);
  const fileInfo = await FileSystem.getInfoAsync(uri);
  return {
    uri,
    exists: fileInfo.exists,
    bytes: fileInfo.exists ? fileInfo.size : 0,
  };
}

/**
 * Download `url` → the key's uri, resuming when a partial download was previously
 * saved. We persist the resumable's `savable()` handle keyed by the cache key so a
 * download interrupted by app kill can be continued on the next launch.
 */
const resumeHandles = new Map<string, string>();

async function download(
  key: string,
  url: string,
  onProgress?: (fraction: number) => void
): Promise<StoredFile> {
  await ensureDir();
  const uri = uriFor(key);

  const callback = (data: FileSystem.DownloadProgressData) => {
    if (!onProgress) return;
    const { totalBytesWritten, totalBytesExpectedToWrite } = data;
    if (totalBytesExpectedToWrite > 0) {
      onProgress(totalBytesWritten / totalBytesExpectedToWrite);
    }
  };

  const resumable = FileSystem.createDownloadResumable(
    url,
    uri,
    {},
    callback,
    resumeHandles.get(key)
  );

  try {
    const result = await resumable.downloadAsync();
    resumeHandles.delete(key);
    if (!result) return info(key);
    return { uri: result.uri, exists: true, bytes: (await info(key)).bytes };
  } catch (error) {
    // Save the resume point so a later attempt continues from the partial bytes.
    try {
      resumeHandles.set(key, resumable.savable().resumeData ?? '');
    } catch {
      /* best effort — a missing resume handle just means a fresh retry */
    }
    throw error;
  }
}

async function remove(key: string): Promise<void> {
  await FileSystem.deleteAsync(uriFor(key), { idempotent: true });
}

export const fileSystemStore: MediaStore = { uriFor, info, download, remove };
