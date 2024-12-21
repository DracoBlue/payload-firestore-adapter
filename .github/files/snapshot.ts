import type { Payload } from 'payload'

export const uploadsDirCache: {
  [key: string]: {
    cacheDir: string
    originalDir: string
  }[]
} = {}

export const dbSnapshot = {}

export async function createSnapshot(
  _payload: Payload,
  snapshotKey: string,
  collectionSlugs: string[],
) {}

export async function restoreFromSnapshot(
  _payload: Payload,
  snapshotKey: string,
  collectionSlugs: string[],
) {}
