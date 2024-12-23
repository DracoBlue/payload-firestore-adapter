import {
  type CountArgs,
  type CreateArgs,
  type CreateGlobalArgs,
  type CreateGlobalVersionArgs,
  type CreateVersionArgs,
  type DeleteManyArgs,
  type DeleteOneArgs,
  type DeleteVersionsArgs,
  type FindArgs,
  type FindGlobalArgs,
  type FindGlobalVersionsArgs,
  type FindOneArgs,
  type FindVersionsArgs,
  type PaginatedDocs,
  type QueryDraftsArgs,
  type SanitizedCollectionConfig,
  type TypeWithVersion,
  type UpdateGlobalArgs,
  type UpdateGlobalVersionArgs,
  type UpdateOneArgs,
  type UpdateVersionArgs,
  type TypeWithID,
  type Document,
  type Where,
  type BasePayload,
} from 'payload'

import {
  collection,
  doc,
  Firestore,
  setDoc,
  terminate,
  getFirestore,
  connectFirestoreEmulator,
  query,
  limit,
  where,
  getDocs,
  deleteDoc,
  getCountFromServer,
  updateDoc,
  UpdateData,
  orderBy,
  and,
} from 'firebase/firestore'
import { initializeApp } from 'firebase/app'
import { convertPayloadToFirestoreQuery, calculatePageResultStatistics } from './firestoreUtils'
import { generateQueryJson } from './firestoreQueryJsonConverter'
import type { FirestoreAdapter } from './types'

export function firestoreAdapter({
  defaultIDType = 'text',
  versionsSuffix,
}: {
  defaultIDType?: 'number' | 'text'
  versionsSuffix?: string
}) {
  function adapter({ payload }: { payload: BasePayload }) {
    return {
      name: 'firestore',
      packageName: 'payload-firestore-adapter',
      sessions: {},
      payload,
      defaultIDType,
      versionsSuffix: versionsSuffix || '_v',
      async create({
        data,
        collection: collectionName,
        draft,
        select,
        locale,
        req,
      }: CreateArgs): Promise<Document> {
        console.log('creating', collectionName, 'with data', data, 'and', {locale, draft, select})
        const colRef = collection(this.firestore as Firestore, collectionName)
        // FIXME: maybe we can change this to use the autogenerated value - but we need data.id to be searchable, too for where queries
        data.id = crypto.randomUUID()
        data.createdAt = data.createdAt || new Date().toISOString()
        data.updatedAt = data.updatedAt || data.createdAt
        if (typeof data.document === 'undefined') {
          delete data.document
        }
        const docRef = doc(colRef, '/' + data.id)
        await setDoc(docRef, JSON.parse(JSON.stringify(data)))
        return { id: docRef.id, ...data }
      },

      async createGlobalVersion<T extends TypeWithID = TypeWithID>({
        autosave,
        createdAt,
        parent,
        updatedAt,
        versionData,
        req,
        select,
        globalSlug: payloadGlobalName,
        publishedLocale,
        snapshot,
      }: CreateGlobalVersionArgs<T>): Promise<TypeWithVersion<T>> {
        return await this.createVersion({
          autosave,
          collectionSlug: payloadGlobalName,
          createdAt,
          parent: parent || payloadGlobalName,
          req,
          select,
          updatedAt,
          versionData,
          publishedLocale,
          snapshot,
        })
      },
      async createVersion<T extends TypeWithID = TypeWithID>({
        autosave,
        collectionSlug,
        createdAt,
        parent,
        select,
        publishedLocale,
        snapshot,
        updatedAt,
        versionData,
      }: CreateVersionArgs<T>): Promise<TypeWithVersion<T>> {
        console.log(
          'creating version',
          collectionSlug,
          'for parent',
          parent,
          'with data',
          versionData,
          {select, publishedLocale, snapshot}
        )
        const colRef = collection(this.firestore as Firestore, collectionSlug + this.versionsSuffix)
        // FIXME: maybe we can change this to use the autogenerated value - but we need data.id to be searchable, too for where queries
        let data: any = {
          id: crypto.randomUUID(),
          createdAt,
          updatedAt,
          parent,
          latest: true,
          version: versionData,
          autosave,
        }
        const docRef = doc(colRef, '/' + data.id)
        console.log('creating version at', collectionSlug + this.versionsSuffix, data)
        await setDoc(docRef, JSON.parse(JSON.stringify(data)))

        let previousLatestVersionDocs = await getDocs(
          query(query(colRef), and(where('parent', '==', parent), where('latest', '==', true))),
        )
        for (let previousLatestVersionDoc of previousLatestVersionDocs.docs) {
          if (previousLatestVersionDoc.id === data.id) {
            console.log('keep to latest for', previousLatestVersionDoc.id)
          } else {
            console.log('setting to nonlatest for', previousLatestVersionDoc.id)
            await updateDoc(previousLatestVersionDoc.ref, {
              latest: false,
            })
          }
        }

        return { id: docRef.id, version: versionData, createdAt, parent, updatedAt }
      },
      async deleteMany({
        collection: collectionName,
        joins,
        where: payloadWhereQuery,
      }: DeleteManyArgs): Promise<void> {
        console.log('delete many from', collectionName,  {joins, where: payloadWhereQuery})
        const colRef = collection(this.firestore as Firestore, collectionName)

        let firestoreQuery = query(colRef)

        let collectionConfig = payload.collections[collectionName]?.config;

        // FIXME: maybe we can optimize if we search for just "one" item by id
        if (payloadWhereQuery) {
          firestoreQuery = convertPayloadToFirestoreQuery(
            this.firestore as Firestore,
            collectionName,
            collectionConfig,
            payloadWhereQuery,
          )
        }

        firestoreQuery = query(firestoreQuery, limit(1))

        let docs = await getDocs(firestoreQuery)
        let deletedDataItems = []
        for (let doc of docs.docs) {
          deletedDataItems.push(doc.data())
          await deleteDoc(doc.ref)
        }
      },
      async deleteOne({
        collection: collectionName,
        joins,
        select,
        where: payloadWhereQuery,
      }: DeleteOneArgs): Promise<any> {
        console.log('delete one from', collectionName, {joins, select, where: payloadWhereQuery});
        const colRef = collection(this.firestore as Firestore, collectionName)

        let firestoreQuery = query(colRef)

        let collectionConfig = payload.collections[collectionName]?.config;

        // FIXME: maybe we can optimize if we search for just "one" item by id
        if (payloadWhereQuery) {
          firestoreQuery = convertPayloadToFirestoreQuery(
            this.firestore as Firestore,
            collectionName,
            collectionConfig,
            payloadWhereQuery,
          )
        }

        firestoreQuery = query(firestoreQuery, limit(1))

        let docs = await getDocs(firestoreQuery)
        let doc = docs.docs[0]

        let data = doc.data()

        for (let doc of docs.docs) {
          await deleteDoc(doc.ref)
        }

        return data
      },
      async deleteVersions({
        collection: nonVersionCollectionName,
        where: payloadWhereQuery,
        req,
        locale,
        sort,
      }: DeleteVersionsArgs): Promise<void> {
        console.log('deleting versions', nonVersionCollectionName, payloadWhereQuery, 'and', {locale, sort});
        let versionCollectionName = nonVersionCollectionName + this.versionsSuffix
        const colRef = collection(this.firestore as Firestore, versionCollectionName)

        let firestoreQuery = query(colRef)

        let collectionConfig = payload.collections[nonVersionCollectionName]?.config;

        if (!collectionConfig) {
          collectionConfig = payload.globals.config.find((global) => global.slug === nonVersionCollectionName) as unknown as SanitizedCollectionConfig;
        }

        // FIXME: maybe we can optimize if we search for just "one" item by id
        if (payloadWhereQuery) {
          firestoreQuery = convertPayloadToFirestoreQuery(
            this.firestore as Firestore,
            versionCollectionName,
            collectionConfig,
            payloadWhereQuery,
          )
        }

        let docs = await getDocs(firestoreQuery)
        for (let doc of docs.docs) {
          console.log('delete version')
          await deleteDoc(doc.ref)
          console.log('deleted version')
        }
      },
      async find<T = TypeWithID>({
        collection: collectionName,
        limit: payloadLimit,
        locale,
        page,
        pagination,
        skip,
        sort,
        select,
        versions,
        where: payloadWhereQuery,
        joins,
        projection,
      }: FindArgs): Promise<PaginatedDocs<T>> {
        console.log('trying to find', collectionName, { joins, projection, versions, skip, locale, select })
        const colRef = collection(this.firestore as Firestore, collectionName)

        let firestoreQuery = query(colRef);

        let collectionConfig = payload.collections[collectionName]?.config;

        if (!sort) {
          console.log('no sort given');
          if (collectionConfig?.defaultSort) {
            console.log('found defaultSort', collectionConfig);
            sort = collectionConfig?.defaultSort;
          }
        }

        if (payloadWhereQuery) {
          firestoreQuery = convertPayloadToFirestoreQuery(
            this.firestore as Firestore,
            collectionName,
            collectionConfig,
            payloadWhereQuery,
            sort,
          )
        } else {
          firestoreQuery = convertPayloadToFirestoreQuery(
            this.firestore as Firestore,
            collectionName,
            collectionConfig,
            null,
            sort,
          )
        }

        let totalDocsCount = (await getCountFromServer(firestoreQuery)).data().count

        let offset = page || 1 > 1 ? (payloadLimit || 0) * ((page || 1) - 1) : 0

        if (payloadLimit) {
          // FIXME: offset in firestore means -> load everything until the limit + page and return just the last page.
          if (offset > 0) {
            firestoreQuery = query(firestoreQuery, limit(payloadLimit + offset))
          } else {
            firestoreQuery = query(firestoreQuery, limit(payloadLimit))
          }
        }

        console.log(generateQueryJson(firestoreQuery));

        let docs = await getDocs(firestoreQuery)
        let dataItems = []

        // FIXME: offset in firestore means -> load everything until the limit + page and return just the last page.
        let rawDocs = docs.docs.slice(offset)

        for (let doc of rawDocs) {
          dataItems.push(doc.data() as T)
        }
        let { totalPages, nextPage, prevPage, pagingCounter, hasNextPage, hasPrevPage } =
          calculatePageResultStatistics({
            totalDocsCount,
            payloadLimit: payloadLimit ? payloadLimit : 0,
            page: page || 1,
            pagination: pagination || false,
          })
        console.log('fetched', collectionName, 'data', dataItems)

        return {
          docs: dataItems,
          hasNextPage,
          hasPrevPage,
          limit: payloadLimit || 0,
          pagingCounter,
          totalDocs: totalDocsCount,
          totalPages,
          nextPage,
          page: page || 1,
          prevPage,
        }
      },
      async findGlobalVersions<T = TypeWithID>({
        global: payloadGlobalName,
        req,
        limit,
        locale,
        page,
        select,
        pagination,
        skip,
        sort,
        where: payloadWhereQuery,
        versions,
      }: FindGlobalVersionsArgs): Promise<PaginatedDocs<TypeWithVersion<T>>> {
        return await this.findVersions({
          collection: payloadGlobalName,
          req,
          limit,
          locale,
          page,
          select,
          pagination,
          skip,
          sort,
          versions,
          where: payloadWhereQuery,
        })
      },
      async findVersions<T = TypeWithID>({
        collection: nonVersionCollectionName,
        limit: payloadLimit,
        locale,
        page,
        select,
        pagination,
        skip,
        sort,
        versions,
        where: payloadWhereQuery,
      }: FindVersionsArgs): Promise<PaginatedDocs<TypeWithVersion<T>>> {
        let versionCollectionName = nonVersionCollectionName + this.versionsSuffix
        console.log('trying to find versions', versionCollectionName, {locale, versions, select})

        const colRef = collection(this.firestore as Firestore, versionCollectionName)

        let firestoreQuery = query(colRef)

        let collectionConfig = payload.collections[nonVersionCollectionName]?.config;

        if (!collectionConfig) {
          collectionConfig = payload.globals.config.find((global) => global.slug === nonVersionCollectionName) as unknown as SanitizedCollectionConfig;
        }

        if (!sort) {
          console.log('no sort given');
          if (collectionConfig?.defaultSort) {
            console.log('found defaultSort', collectionConfig);
            sort = collectionConfig?.defaultSort;
          }
        }

        payload.globals

        if (payloadWhereQuery) {
          firestoreQuery = convertPayloadToFirestoreQuery(
            this.firestore as Firestore,
            versionCollectionName,
            collectionConfig,
            payloadWhereQuery,
            sort,
          )
        } else {
          firestoreQuery = convertPayloadToFirestoreQuery(
            this.firestore as Firestore,
            versionCollectionName,
            collectionConfig,
            null,
            sort,
          )
        }

        let totalDocsCount = (await getCountFromServer(firestoreQuery)).data().count

        let offset = (skip || 0) + (page || 1 > 1 ? (payloadLimit || 0) * ((page || 1) - 1) : 0)

        if (payloadLimit) {
          // FIXME: offset in firestore means -> load everything until the limit + page and return just the last page.
          if (offset > 0) {
            firestoreQuery = query(firestoreQuery, limit(payloadLimit + offset))
          } else {
            firestoreQuery = query(firestoreQuery, limit(payloadLimit))
          }
        } else {
          if (offset > 0) {
            firestoreQuery = query(firestoreQuery, limit(offset))
          }
        }

        console.log('searching versions', generateQueryJson(firestoreQuery))

        let docs = await getDocs(firestoreQuery)
        let dataItems = []

        // FIXME: offset in firestore means -> load everything until the limit + page and return just the last page.
        let rawDocs = docs.docs.slice(offset)

        for (let doc of rawDocs) {
          let data = doc.data() as TypeWithVersion<T>
          dataItems.push(data)
        }
        let { totalPages, nextPage, prevPage, pagingCounter, hasNextPage, hasPrevPage } =
          calculatePageResultStatistics({
            totalDocsCount,
            payloadLimit: payloadLimit ? payloadLimit : 0,
            page: page || 1,
            pagination: pagination || false,
          })
        console.log('found versions', versionCollectionName, dataItems)
        return {
          docs: dataItems,
          hasNextPage,
          hasPrevPage,
          limit: payloadLimit || 0,
          pagingCounter,
          totalDocs: totalDocsCount,
          totalPages,
          nextPage,
          page: page || 1,
          prevPage,
        }
      },
      async queryDrafts<T = TypeWithID>({
        collection: nonVersionCollectionName,
        limit: payloadLimit,
        locale,
        page,
        pagination,
        sort,
        select,
        where: payloadWhereQuery,
        joins,
      }: QueryDraftsArgs): Promise<PaginatedDocs<T>> {
        const versionCollectionName = nonVersionCollectionName + this.versionsSuffix
        console.log('trying to find drafts', versionCollectionName, { joins, locale, select })

        const colRef = collection(this.firestore as Firestore, versionCollectionName)

        let firestoreQuery = query(colRef)

        let collectionConfig = payload.collections[nonVersionCollectionName]?.config;

        if (!collectionConfig) {
          collectionConfig = payload.globals.config.find((global) => global.slug === nonVersionCollectionName) as unknown as SanitizedCollectionConfig;
        }

        if (!sort) {
          console.log('no sort given');
          if (collectionConfig?.defaultSort) {
            console.log('found defaultSort', collectionConfig);
            sort = collectionConfig?.defaultSort;
          }
        }

        if (payloadWhereQuery) {
          firestoreQuery = convertPayloadToFirestoreQuery(
            this.firestore as Firestore,
            versionCollectionName,
            collectionConfig,
            payloadWhereQuery,
            sort,
          )
        } else {
          firestoreQuery = convertPayloadToFirestoreQuery(
            this.firestore as Firestore,
            versionCollectionName,
            collectionConfig,
            null,
            sort,
          )
        }

        firestoreQuery = query(firestoreQuery, where('latest', '==', true))

        let totalDocsCount = (await getCountFromServer(firestoreQuery)).data().count

        console.log('searching drafts', generateQueryJson(firestoreQuery))

        let offset = page || 1 > 1 ? (payloadLimit || 0) * ((page || 1) - 1) : 0

        if (payloadLimit) {
          // FIXME: offset in firestore means -> load everything until the limit + page and return just the last page.
          if (offset > 0) {
            firestoreQuery = query(firestoreQuery, limit(payloadLimit + offset))
          } else {
            firestoreQuery = query(firestoreQuery, limit(payloadLimit))
          }
        }

        let docs = await getDocs(firestoreQuery)
        let dataItems = []

        // FIXME: offset in firestore means -> load everything until the limit + page and return just the last page.
        let rawDocs = docs.docs.slice(offset)

        for (let doc of rawDocs) {
          let data = doc.data() as TypeWithVersion<T>
          dataItems.push({
            id: data.parent,
            ...data.version,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          })
        }
        let { totalPages, nextPage, prevPage, pagingCounter, hasNextPage, hasPrevPage } =
          calculatePageResultStatistics({
            totalDocsCount,
            payloadLimit: payloadLimit ? payloadLimit : 0,
            page: page || 1,
            pagination: pagination || false,
          })
        return {
          docs: dataItems,
          hasNextPage,
          hasPrevPage,
          limit: payloadLimit || 0,
          pagingCounter,
          totalDocs: totalDocsCount,
          totalPages,
          nextPage,
          page: page || 1,
          prevPage,
        }
      },
      async updateGlobalVersion<T extends TypeWithID = TypeWithID>({
        global: payloadGlobalName,
        req,
        versionData,
        id,
        select,
        locale,
        where: payloadWhereQuery,
      }: UpdateGlobalVersionArgs<T>): Promise<TypeWithVersion<T>> {
        if (id) {
          return await this.updateVersion({
            collection: payloadGlobalName,
            req,
            versionData,
            
            id,
            locale,
          })
        }
        return await this.updateVersion({
          collection: payloadGlobalName,
          req,
          versionData,
          locale,
          where: payloadWhereQuery as Where,
        })
      },
      async updateOne({
        data,
        collection: collectionName,
        draft,
        locale,
        select,
        joins,
        options,
        req,
        id,
        where: payloadWhereQuery,
      }: UpdateOneArgs): Promise<any> {
        const colRef = collection(this.firestore as Firestore, collectionName)
        console.log('Updating document', collectionName, 'with id', id, {locale, draft, select, joins, options, where: payloadWhereQuery}, 'and data', data)
        const docRef = doc(colRef, '/' + id)
        // FIXME: do not ignore where!
        const updateData: Partial<any> = { ...data }
        await updateDoc(docRef, JSON.parse(JSON.stringify(updateData)))
        return { id: docRef.id, ...data }
      },
      updateVersion<T extends TypeWithID = TypeWithID>(
        args: UpdateVersionArgs<T>,
      ): Promise<TypeWithVersion<T>> {
        console.error('Function updateVersion not implemented.')
        throw new Error('Function updateVersion not implemented.')
      },
      count: async function ({
        collection: collectionName,
        locale,
        where: payloadWhereQuery,
      }: CountArgs): Promise<{ totalDocs: number }> {
        console.log('trying to count', collectionName, { locale, payloadWhereQuery })
        const colRef = collection(this.firestore as Firestore, collectionName)

        let firestoreQuery = query(colRef)

        let collectionConfig = payload.collections[collectionName]?.config;

        if (payloadWhereQuery) {
          firestoreQuery = convertPayloadToFirestoreQuery(
            this.firestore as Firestore,
            collectionName,
            collectionConfig,
            payloadWhereQuery,
          )
        }

        let totalDocsCount = (await getCountFromServer(firestoreQuery)).data().count
        console.log('counted ', collectionName, 'amount', totalDocsCount)

        return {
          totalDocs: totalDocsCount,
        }
      },
      createGlobal: async function <T extends Record<string, unknown> = any>({
        data,
        req,
        slug: payloadGlobalName,
      }: CreateGlobalArgs<T>): Promise<T> {
        console.log('creating global', payloadGlobalName, 'with data', data)
        const colRef = collection(this.firestore as Firestore, payloadGlobalName)
        // FIXME: maybe we can change this to use the autogenerated value - but we need data.id to be searchable, too for where queries
        //data.id = payloadGlobalName
        //data.createdAt = data.createdAt || new Date().toISOString()
        //data.updatedAt = data.updatedAt || data.createdAt
        const docRef = doc(colRef, '/' + payloadGlobalName)
        await setDoc(docRef, JSON.parse(JSON.stringify(data)))
        return { id: docRef.id, ...data }
      },
      findGlobal: async function <T extends Record<string, unknown> = any>({
        slug: payloadGlobalName,
        req,
        select,
        locale,
        where: payloadWhereQuery,
      }: FindGlobalArgs): Promise<T> {
        console.log('findGlobal in', payloadGlobalName, 'where', payloadWhereQuery, 'and', {select, locale});
        let doc = this.findOne({
          collection: payloadGlobalName,
          req,
          select,
          locale,
          where: payloadWhereQuery,
        })
        if (doc !== null) {
          doc.globalType = payloadGlobalName
          return doc
        }

        return null
      },
      findOne: async function <T extends TypeWithID>({
        collection: payloadCollectionName,
        where: payloadWhereQuery,
        select,
        locale,
        joins,
      }: FindOneArgs): Promise<T | null> {
        const colRef = collection(this.firestore as Firestore, payloadCollectionName)
        console.log('fetch one', payloadCollectionName, 'where', payloadWhereQuery, 'and', {joins, locale, select })

        let firestoreQuery = query(colRef)
        let collectionConfig = payload.collections[payloadCollectionName]?.config;

        // FIXME: maybe we can optimize if we search for just "one" item by id
        if (payloadWhereQuery) {
          firestoreQuery = convertPayloadToFirestoreQuery(
            this.firestore as Firestore,
            payloadCollectionName,
            collectionConfig,
            payloadWhereQuery,
          )
        }

        firestoreQuery = query(firestoreQuery, limit(1))

        let docs = await getDocs(firestoreQuery)
        // FIXME: ended (e.g. by using getDoc and ID reference)
        if (!docs.docs[0]) {
          return null
        }
        console.log('fetched ', payloadCollectionName, 'data', docs.docs[0].data())
        return docs.docs[0].data() as T
      },
      updateGlobal: function <T extends Record<string, unknown> = any>({
        data,
        req,
        select,
        slug: payloadGlobalName,
      }: UpdateGlobalArgs<T>): Promise<T> {
        // FIXME: the data is not stored in the latest item
        return this.updateOne({
          collection: payloadGlobalName,
          data,
          select, 
          req,
          id: payloadGlobalName,
        })
      },
      connect: async function (): Promise<void> {
          const app = initializeApp({
            apiKey: process.env.FIRESTORE_API_KEY,
            authDomain: process.env.FIRESTORE_AUTH_DOMAIN,
            projectId: process.env.FIRESTORE_PROJECT_ID,
            storageBucket: process.env.FIRESTORE_STORAGE_BUCKET,
            messagingSenderId: process.env.FIRESTORE_MESSAGING_SENDER_ID,
            appId: process.env.FIRESTORE_APP_ID,
          });
        if (this.firestore) {
          console.log('terminate firestore');
          await terminate(this.firestore);
        }
        console.log('connecting firestore');
        this.firestore = getFirestore(app)
        if (process.env.FIRESTORE_EMULATOR_HOST) {
          let [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
          console.log('use firestore emulator');
          connectFirestoreEmulator(this.firestore, host, parseInt(port, 10))
        }
      },
      beginTransaction: async function (
        options?: Record<string, unknown>,
      ): Promise<null | number | string> {
        console.error('Function beginTransaction not implemented.')

        //throw new Error('Function beginTransaction not implemented.');
        return null
      },
      commitTransaction: async function (
        id: number | Promise<number | string> | string,
      ): Promise<void> {
        console.error('Function commitTransaction not implemented.')

        //throw new Error('Function commitTransaction not implemented.');
      },
      rollbackTransaction: async function (
        id: number | Promise<number | string> | string,
      ): Promise<void> {
        console.error('Function rollbackTransaction not implemented.')

        throw new Error('Function rollbackTransaction not implemented.')
      },
      upsert: function ({
        collection: payloadCollectionName,
        where: payloadWhereQuery,
        data,
        req,
        joins,
        select,
        locale,
      }: any): Promise<Document> {
        return this.updateOne({
          collection: payloadCollectionName,
          data,
          req,
          joins,
          select,
          locale,
          where: payloadWhereQuery,
        })
      },

      async dropDatabase({adapter}: {adapter: any}): Promise<void> {
        console.log('starting to dropDatabase database');
        for (let collectionConfig of (payload.config.collections || [])) {
          let collectionDocs = await getDocs(collection(this.firestore as Firestore, collectionConfig.slug));
          for (let doc of collectionDocs.docs) {
            console.log('Deleting doc id:', doc.id, 'of', collectionConfig.slug);
            await deleteDoc(doc.ref);
          }
        }
        for (let globalConfig of (payload.config.globals || [])) {
          let globalDocs = await getDocs(collection(this.firestore as Firestore, globalConfig.slug));
          for (let doc of globalDocs.docs) {
            console.log('Deleting doc id:', doc.id, 'of', globalConfig.slug);
            await deleteDoc(doc.ref);
          }
        }
        console.log('finished to dropDatabase database');
      },

      init: async function (): Promise<void> {
        console.error('Function init not implemented.')
      },
    };
  }

  return {
    defaultIDType,
    init: adapter,
  }
}
