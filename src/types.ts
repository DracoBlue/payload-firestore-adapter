
import type { BaseDatabaseAdapter } from 'payload'

import {
    Firestore,
  } from 'firebase-admin/firestore'

export type FirestoreAdapter = BaseDatabaseAdapter & {
    firestore?: Firestore
    versionsSuffix: string
  }
  