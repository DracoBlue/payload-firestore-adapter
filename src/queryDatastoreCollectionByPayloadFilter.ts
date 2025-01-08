import type { DatastoreRequest } from '@google-cloud/datastore';
import type { SanitizedCollectionConfig, Sort, TypeWithID } from 'payload';
import { convertPayloadToFirestoreQuery } from './convertPayloadToFirestoreQuery';
import { applyPayloadFilter } from './applyPayloadFilter';

export const queryDatastoreCollectionByPayloadFilter = async <T = TypeWithID>({
  datastoreRequest, collectionName, collectionConfig, payloadQuery, payloadSort, payloadLimit, page, pagination, fetchData = true, countData = true, fetchKeysOnly = false, skip, locale
}: {
  datastoreRequest: DatastoreRequest, collectionName: string, collectionConfig: SanitizedCollectionConfig, payloadQuery: Record<string, any>, payloadSort?: Sort, payloadLimit: number, page: number, pagination: boolean, fetchData?: boolean, fetchKeysOnly?: boolean, countData?: boolean, skip: number, locale?: string
}) => {
  if (!payloadSort) {
    if (collectionConfig?.defaultSort) {
      payloadSort = collectionConfig?.defaultSort;
    }
  }

  let [fetchQuery, hasNodeConditions] = convertPayloadToFirestoreQuery(datastoreRequest, collectionName, collectionConfig, payloadQuery, payloadSort, locale);
  if (fetchKeysOnly) {
    fetchQuery = fetchQuery.select('__key__');
  }

  let [countQuery] = convertPayloadToFirestoreQuery(datastoreRequest, collectionName, collectionConfig, payloadQuery, [], locale);
  countQuery = countQuery.select('__key__');
  countQuery.orders = [];

  let offset = (skip || 0) + (page || 1 > 1 ? (payloadLimit || 0) * ((page || 1) - 1) : 0)

  if (payloadLimit) {
    fetchQuery = fetchQuery.limit(payloadLimit);
  }
  if (offset > 0) {
    fetchQuery = fetchQuery.offset(offset);
  }

  let { totalPages, nextPage, prevPage, pagingCounter, hasNextPage, hasPrevPage, totalDocs } = countData ? (calculatePageResultStatistics({
    totalDocsCount: (await countQuery.run())[0].length,
    payloadLimit: payloadLimit ? payloadLimit : 0,
    page: page || 1,
    pagination: pagination || false,
  })) : { totalPages: 0, totalDocs: 0, nextPage: null, prevPage: null, pagingCounter: null, hasNextPage: null, hasPrevPage: null};

  let docs = []

  if (fetchData) {
    let [rawDocs, runQueryInfo] = await fetchQuery.run();

    rawDocs = rawDocs.filter(rawDoc => applyPayloadFilter(rawDoc, payloadQuery, collectionConfig.flattenedFields, locale));

    if (fetchKeysOnly) {
      for (let doc of rawDocs) {
        docs.push({ key: doc[datastoreRequest.KEY] });
      }
    } else {
      for (let doc of rawDocs) {
        doc = { id: doc[datastoreRequest.KEY]?.name, ...doc };
        docs.push(doc as T)
      }
    }
  }

  return {
    docs,
    hasNextPage,
    hasPrevPage,
    limit: payloadLimit || 0,
    pagingCounter,
    totalDocs,
    totalPages,
    nextPage,
    page: page || 1,
    prevPage,
  }
}

export const calculatePageResultStatistics = ({
  totalDocsCount, payloadLimit = 0, page = 1, pagination
}: { totalDocsCount: number, payloadLimit: number, page: number, pagination: boolean }): { totalPages: number, totalDocs: number, prevPage: number | null, nextPage: number | null, pagingCounter: number, hasNextPage: boolean, hasPrevPage: boolean } => {
  if (payloadLimit === 0) {
    return {
      totalPages: 1,
      totalDocs: totalDocsCount,
      hasNextPage: false,
      hasPrevPage: false,
      prevPage: null,
      nextPage: null,
      pagingCounter: 1
    };
  }
  let totalPages = Math.ceil(totalDocsCount / payloadLimit);
  return {
    totalPages,
    totalDocs: totalDocsCount,
    pagingCounter: page,
    nextPage: page < totalPages ? page + 1 : null,
    hasNextPage: page < totalPages,
    prevPage: page !== 1 ? page - 1 : null,
    hasPrevPage: page !== 1
  }
};
