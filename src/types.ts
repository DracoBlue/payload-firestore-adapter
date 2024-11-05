
import type { BaseDatabaseAdapter } from 'payload'

import {
    Firestore,
  } from 'firebase/firestore'

export type FirestoreAdapter = BaseDatabaseAdapter & {
    firestore?: Firestore
    versionsSuffix: string
  }
  