
import type { BaseDatabaseAdapter } from 'payload'

import {
    Datastore,
  } from '@google-cloud/datastore'

export type FirestoreAdapter = BaseDatabaseAdapter & {
    firestore?: Datastore
    versionsSuffix: string
  }
  