import type { Payload } from 'payload'

export async function resetDB(_payload: Payload, collectionSlugs: string[]) {
  if (['firestore'].includes(process.env.PAYLOAD_DATABASE)) {
    await _payload.db.dropDatabase({ adapter: _payload.db } as { adapter: any })
  }
}
