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
  type FieldBase,
} from 'payload'

import { Datastore, Query, or, and, PropertyFilter } from '@google-cloud/datastore';

import { convertPayloadToFirestoreQuery, calculatePageResultStatistics } from './firestoreUtils'
import { logQuery } from './firestoreQueryJsonConverter'
import type { FirestoreAdapter } from './types'
import { RunQueryInfo, RunQueryResponse } from '@google-cloud/datastore/build/src/query';

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

        // FIXME: maybe we can change this to use the autogenerated value - but we need data.id to be searchable, too for where queries
        data.id = data.id || crypto.randomUUID();
        data.createdAt = data.createdAt || new Date().toISOString()
        data.updatedAt = data.createdAt
        if (typeof data.document === 'undefined') {
          delete data.document
        }

        let fields = payload.collections[collectionName]?.config?.fields as FieldBase[];

        let prefillDefaultValues = (data, fields) => {
          for (let field of fields) {
            if (typeof data[field.name] === "undefined" && typeof field.defaultValue !== "undefined") {
              if (field.type === "point") {
                data[field.name] = {
                  type: 'Point',
                  coordinates: field.defaultValue
                };
              } else {
                data[field.name] = field.defaultValue;
              }
            }
            if (field.type === "group") {
              prefillDefaultValues(data[field.name], field.fields);
            }
            if (field.type === "array") {
              for (let pos in data[field.name]) {
                prefillDefaultValues(data[field.name][pos], field.fields);
              }
            }
          }
        };

        prefillDefaultValues(data, fields);

        let entity = {
          key: (this.firestore as Datastore).key([collectionName, data.id as string]),
          data: {
            ...JSON.parse(JSON.stringify(data))
          },
        };
      
        await (this.firestore as Datastore).insert(entity);

        return { id: data.id, ...data }
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

        console.log('creating version at', collectionSlug + this.versionsSuffix, data)
        await (this.firestore as Datastore).insert({
          key: (this.firestore as Datastore).key([collectionSlug + this.versionsSuffix, data.id]),
          data: {
            ...JSON.parse(JSON.stringify(data))
          },
        })

        try {
          let [previousLatestVersionDocs] = await (this.firestore as Datastore).createQuery(collectionSlug + this.versionsSuffix).filter('parent', '=', parent).filter('latest', '=', true).run();

          for (let previousLatestVersionDoc of previousLatestVersionDocs) {
            if (previousLatestVersionDoc.id === data.id) {
              console.log('keep to latest for', previousLatestVersionDoc.id)
            } else {
              console.log('setting to nonlatest for', previousLatestVersionDoc.id)

              await (this.firestore as Datastore).update({
                key: previousLatestVersionDoc[(this.firestore as Datastore).KEY],
                data: {
                  latest: false,
                },
              });
            }
          }
        } catch (error) {
          console.error('fetch latest version doc', error);
        }

        return { id: data.id, version: versionData, createdAt, parent, updatedAt }
      },
      async deleteMany({
        collection: collectionName,
        joins,
        where: payloadWhereQuery,
      }: DeleteManyArgs): Promise<void> {
        console.log('delete many from', collectionName,  {joins, where: payloadWhereQuery})
        let firestoreQuery = (this.firestore as Datastore).createQuery(collectionName).select('__key__');

        let collectionConfig = payload.collections[collectionName]?.config;

        // FIXME: maybe we can optimize if we search for just "one" item by id
        if (payloadWhereQuery) {
          firestoreQuery = convertPayloadToFirestoreQuery(
            this.firestore as Datastore,
            collectionName,
            collectionConfig,
            payloadWhereQuery,
          )
        }

        // FIXME: should check for "in" with empty array!

        console.log('fetch for deletion');
        try {
          let [docs, runQueryInfo] : [any[], RunQueryInfo] = await firestoreQuery.run();
          console.log('found for deletion', docs, runQueryInfo);
          let keys = [];
          for (let doc of docs) {
            keys.push(doc[this.firestore.KEY]);
          }
          if (keys.length) {
            await (this.firestore as Datastore).delete(keys);
          }
        } catch (error) {
          console.error('deletion error', error);
        }
      },
      async deleteOne({
        collection: collectionName,
        joins,
        select,
        where: payloadWhereQuery,
      }: DeleteOneArgs): Promise<any> {
        console.log('delete one from', collectionName, {joins, select, where: payloadWhereQuery});
        let collectionConfig = payload.collections[collectionName]?.config;

        // FIXME: maybe we can optimize if we search for just "one" item by id
        let firestoreQuery = convertPayloadToFirestoreQuery(
          this.firestore as Datastore,
          collectionName,
          collectionConfig,
          payloadWhereQuery ? payloadWhereQuery : null,
        ).select('__key__').limit(1);

        let [docs, runQueryInfo] : [any[], RunQueryInfo] = await firestoreQuery.run();
        let doc = docs[0];

        await (this.firestore as Datastore).delete(doc[this.firestore.KEY]);

        return JSON.parse(JSON.stringify(doc));
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
        let collectionConfig = payload.collections[nonVersionCollectionName]?.config;

        if (!collectionConfig) {
          collectionConfig = payload.globals.config.find((global) => global.slug === nonVersionCollectionName) as unknown as SanitizedCollectionConfig;
        }

        // FIXME: maybe we can optimize if we search for just "one" item by id
        let firestoreQuery = convertPayloadToFirestoreQuery(
          this.firestore as Datastore,
          versionCollectionName,
          collectionConfig,
          payloadWhereQuery ? payloadWhereQuery : null,
        )

        let [docs] = await firestoreQuery.run();
        if (docs.length) {
          console.log('delete versions')
          await (this.firestore as Datastore).delete(docs.map((doc) => doc[this.firestore.KEY]));
          console.log('deleted versions')
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
        let collectionConfig = payload.collections[collectionName]?.config;

        if (!sort) {
          console.log('no sort given');
          if (collectionConfig?.defaultSort) {
            console.log('found defaultSort', collectionConfig);
            sort = collectionConfig?.defaultSort;
          }
        }

        let firestoreQuery = convertPayloadToFirestoreQuery(
          this.firestore as Datastore,
          collectionName,
          collectionConfig,
          payloadWhereQuery ? payloadWhereQuery : null,
          sort,
        );

        let countQuery = convertPayloadToFirestoreQuery(
          this.firestore as Datastore,
          collectionName,
          collectionConfig,
          payloadWhereQuery ? payloadWhereQuery : null,
          null,
        ).select('__key__').limit(-1).offset(-1);
        countQuery.orders = [];

        logQuery('countQuery', countQuery);
        let [totalDocsKeys] = await countQuery.run();
        let totalDocsCount = totalDocsKeys.length;
        console.log('counted!', totalDocsCount);

        let offset = page || 1 > 1 ? (payloadLimit || 0) * ((page || 1) - 1) : 0

        if (payloadLimit) {
          firestoreQuery = firestoreQuery.limit(payloadLimit);
        }
        if (offset > 0) {
          firestoreQuery = firestoreQuery.offset(offset);
        }

        logQuery('will run now', firestoreQuery);
        let docs = [];
        if (totalDocsCount) {
          let runQueryInfo = null;
          [docs, runQueryInfo] = await firestoreQuery.run();
          console.log('did run now');
          console.log('docs', docs);
          console.log('runQueryInfo', runQueryInfo);
        }

        let dataItems = []

        for (let doc of docs) {
          doc = {id: doc[this.firestore.KEY]?.name, ...doc};
          dataItems.push(doc as T)
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
      async countGlobalVersions<T = TypeWithID>({
        global: payloadGlobalName,
        req,
        locale,
        where: payloadWhereQuery
      }: any): Promise<any> {
        return await this.countVersions({
          collection: payloadGlobalName,
          req,
          locale,
          where: payloadWhereQuery,
        })
      },      
      async countVersions<T = TypeWithID>({
        collection: nonVersionCollectionName,
        req,
        locale,
        where: payloadWhereQuery,
      }: any): Promise<any> {
        let versionCollectionName = nonVersionCollectionName + this.versionsSuffix
        console.log('trying to count versions', versionCollectionName, {locale})

        let collectionConfig = payload.collections[nonVersionCollectionName]?.config;

        if (!collectionConfig) {
          collectionConfig = payload.globals.config.find((global) => global.slug === nonVersionCollectionName) as unknown as SanitizedCollectionConfig;
        }

        let countQuery = convertPayloadToFirestoreQuery(
          this.firestore as Datastore,
          versionCollectionName,
          collectionConfig,
          payloadWhereQuery ? payloadWhereQuery : null,
          null,
        ).select('__key__').limit(-1).offset(-1);
        countQuery.orders = [];
        
        let [totalDocsKeys] = await countQuery.run();
        let totalDocsCount = totalDocsKeys.length;

        return {
          totalDocs: totalDocsCount
        }
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

        let firestoreQuery = convertPayloadToFirestoreQuery(
          this.firestore as Datastore,
          versionCollectionName,
          collectionConfig,
          payloadWhereQuery ? payloadWhereQuery : null,
          sort,
        )

        let countQuery = convertPayloadToFirestoreQuery(
          this.firestore as Datastore,
          versionCollectionName,
          collectionConfig,
          payloadWhereQuery ? payloadWhereQuery : null,
          null,
        ).select('__key__').limit(-1).offset(-1);
        countQuery.orders = [];

        logQuery('countQuery', countQuery);
        let [totalDocsKeys] = await countQuery.run();
        let totalDocsCount = totalDocsKeys.length;
        console.log('counted!', totalDocsCount);

        let offset = (skip || 0) + (page || 1 > 1 ? (payloadLimit || 0) * ((page || 1) - 1) : 0)

        if (offset > 0) {
          firestoreQuery = firestoreQuery.offset(offset);
        }
        if (payloadLimit) {
          firestoreQuery = firestoreQuery.limit(payloadLimit);
        }

        logQuery('searching versions', firestoreQuery)

        let docs = [];

        if (totalDocsCount) {
          let runQueryInfo = null;
          [docs, runQueryInfo] = await firestoreQuery.run();
        }

        let dataItems = []

        for (let doc of docs) {
          let data = doc as TypeWithVersion<T>
          dataItems.push({id: doc[this.firestore.KEY], ...data});
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

        let firestoreQuery = convertPayloadToFirestoreQuery(
          this.firestore as Datastore,
          versionCollectionName,
          collectionConfig,
          payloadWhereQuery ? payloadWhereQuery : null,
          sort,
        ).filter('latest', '=', true);


        let countQuery = convertPayloadToFirestoreQuery(
          this.firestore as Datastore,
          versionCollectionName,
          collectionConfig,
          payloadWhereQuery ? payloadWhereQuery : null,
          sort,
        ).filter('latest', '=', true).select('__key__').limit(-1).offset(-1);
        countQuery.orders = [];

        let [totalDocsKeys] = (await countQuery.run());
        let totalDocsCount = totalDocsKeys.length;

        logQuery('searching drafts', firestoreQuery)

        let offset = page || 1 > 1 ? (payloadLimit || 0) * ((page || 1) - 1) : 0

        if (offset > 0) {
          firestoreQuery = firestoreQuery.offset(offset);
        }
        if (payloadLimit) {
          // FIXME: offset in firestore means -> load everything until the limit + page and return just the last page.
          firestoreQuery = firestoreQuery.limit(payloadLimit);
        }

        let [docs] = await firestoreQuery.run()
        let dataItems = []

        for (let doc of docs) {
          let data = doc as TypeWithVersion<T>
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
        console.log('Updating document', collectionName, 'with id', id, {locale, draft, select, joins, options, where: payloadWhereQuery}, 'and data', data)
        await (this.firestore as Datastore).update({
          key: (this.firestore as Datastore).key([collectionName, id]),
          data: {
            ...data
          },
        })
        return { id, ...data }
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
        let collectionConfig = payload.collections[collectionName]?.config;

        let countQuery = convertPayloadToFirestoreQuery(
          this.firestore as Datastore,
          collectionName,
          collectionConfig,
          payloadWhereQuery ? payloadWhereQuery : null,
          null,
        ).select('__key__').limit(-1).offset(-1);
        countQuery.orders = [];

        logQuery('countQuery', countQuery);
        let [totalDocsKeys] = await countQuery.run();
        let totalDocsCount = totalDocsKeys.length;
        console.log('counted! ', collectionName, 'amount', totalDocsCount)

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
        //data.id = payloadGlobalName
        //data.createdAt = data.createdAt || new Date().toISOString()
        //data.updatedAt = data.updatedAt || data.createdAt
        await (this.firestore as Datastore).insert({
          key: (this.firestore as Datastore).key([payloadGlobalName, payloadGlobalName]),
          data: {
            ...JSON.parse(JSON.stringify(data))
          },
        });
        return { id: payloadGlobalName, ...data }
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
        let firestoreQuery = (this.firestore as Datastore).createQuery(payloadCollectionName).limit(1);
        console.log('fetch one', payloadCollectionName, 'where', payloadWhereQuery, 'and', {joins, locale, select })

        let collectionConfig = payload.collections[payloadCollectionName]?.config;

        // FIXME: maybe we can optimize if we search for just "one" item by id
        if (payloadWhereQuery) {
          firestoreQuery = convertPayloadToFirestoreQuery(
            this.firestore as Datastore,
            payloadCollectionName,
            collectionConfig,
            payloadWhereQuery,
          )
          firestoreQuery = firestoreQuery.limit(1);
        }

        let [docs] = await firestoreQuery.run();
        // FIXME: ended (e.g. by using getDoc and ID reference)
        if (!docs[0]) {
          return null
        }
        console.log('fetched ', payloadCollectionName, 'data', docs[0])
        return ({id: docs[0][this.firestore.KEY].name, ...docs[0]} as T)
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

        console.log('connecting firestore');

        this.firestore = new Datastore({
          projectId: process.env.FIRESTORE_PROJECT_ID,
          databaseId: process.env.FIRESTORE_DATABASE_ID,
        }) as any;
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
          let [collectionDocs] = await (this.firestore as Datastore).createQuery(collectionConfig.slug).select('__key__').run();
          if (collectionDocs.length) {
            await (this.firestore as Datastore).delete(collectionDocs.map((doc) => doc[this.firestore.KEY]));
          }
        }
        for (let globalConfig of (payload.config.globals || [])) {
          let [globalDocs] = await (this.firestore as Datastore).createQuery(globalConfig.slug).select('__key__').run();
          if (globalDocs.length) {
            await (this.firestore as Datastore).delete(globalDocs.map((doc) => doc[this.firestore.KEY]));
          }
        }
        console.log('finished to dropDatabase database');
      },
      init: async function (): Promise<void> {
        console.error('Function init not implemented.')
      },
      destroy: async function (): Promise<void> {
        console.error('Function destroy not implemented.')
      },
    };
  }

  return {
    defaultIDType,
    init: adapter,
  }
}
