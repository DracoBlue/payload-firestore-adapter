import console from 'console'
global.console = console

import { generateDatabaseAdapter, allDatabaseAdapters } from './generateDatabaseAdapter.js'

process.env.PAYLOAD_DISABLE_ADMIN = 'true'
process.env.PAYLOAD_DROP_DATABASE = 'true'

process.env.PAYLOAD_PUBLIC_CLOUD_STORAGE_ADAPTER = 's3'

process.env.NODE_OPTIONS = '--no-deprecation'
process.env.PAYLOAD_CI_DEPENDENCY_CHECKER = 'true'

process.env.FIRESTORE_PROJECT_ID = "example-" + Date.now();

const dbAdapter = process.env.PAYLOAD_DATABASE || 'mongodb'

allDatabaseAdapters['firestore'] = `
import { firestoreAdapter } from '../../dist/index.js';

process.env.FIRESTORE_PROJECT_ID = "example-" + Date.now();

export const databaseAdapter = firestoreAdapter({

})`

generateDatabaseAdapter(dbAdapter)
