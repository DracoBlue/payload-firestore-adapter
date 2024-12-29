import { Datastore, Query, or, and, PropertyFilter } from '@google-cloud/datastore';
import type { Field, SanitizedCollectionConfig, Sort } from 'payload';

type Filter = any;

/**
 * Converts Payload CMS query JSON to Firestore query constraints.
 * @param {string} collectionName - The Firestore collection name.
 * @param {Object} payloadQuery - The Payload CMS query JSON.
 * @returns {Query} - Firestore query.
 */
export const convertPayloadToFirestoreQuery = function(datastore: Datastore, collectionName: string, collectionConfig: SanitizedCollectionConfig, payloadQuery: Record<string, any>, payloadSort?: Sort) {
  console.log('convertPayloadToFirestoreQuery', collectionName, JSON.stringify(payloadQuery, null, 4));

  let fieldNameMapCache = null;
  let fillSubFieldNameMapCache = (fields, prefix) => {
    for (let field of fields as Field[]) {
      fieldNameMapCache[prefix + (field as any).name] = field;
      if (field.type === "array") {
        fillSubFieldNameMapCache(field.fields, prefix + (field as any).name + ".");
      }
      if (field.type === "group") {
        fillSubFieldNameMapCache(field.fields, prefix + (field as any).name + ".");
      }
    }
  }

  let getFieldConfigByName = (name, fields) => {
    if (fieldNameMapCache === null) {
      fieldNameMapCache = {}
      fillSubFieldNameMapCache(fields, "");
    }
    return fieldNameMapCache[name] || {};
  }

  const processQuery = (queryObj: Record<string, any>): Filter[] => {
    const constraints: Filter[] = [];

    if (queryObj.and) {
      queryObj.and.forEach((condition: any) => {
        if (condition.or) {
          const orConditions = processQuery(condition);
          if (orConditions.length === 1) {
            constraints.push(orConditions[0]);
          } else {
            constraints.push(or(orConditions));
          }
        } else {
          const andConditions = processQuery(condition);
          if (andConditions.length === 1) {
            constraints.push(andConditions[0]);
          } else {
            constraints.push(and(andConditions));
          }
        }
      });
    } else if (queryObj.or) {
      const orConditions = queryObj.or.map((condition: any) => processQuery(condition));
      const flattenedConstraints = orConditions.flat() as Filter[];
      if (flattenedConstraints.length === 1) {
        constraints.push(flattenedConstraints[0]);
      } else {
        constraints.push(or(flattenedConstraints));
      }
    } else {
      for (const key in queryObj) {
        const condition = queryObj[key];
        if (typeof condition === 'string' || typeof condition === 'number') {
          constraints.push(new PropertyFilter(key, '=', condition));
        } else if (typeof condition === 'object') {
          if (condition.hasOwnProperty('greater_than')) {
            constraints.push(new PropertyFilter(key, '>', condition['greater_than']));
          }
          if (condition.hasOwnProperty('greater_than_equal')) {
            constraints.push(new PropertyFilter(key, '>=', condition['greater_than_equal']));
          }
          if (condition.hasOwnProperty('less_than')) {
            constraints.push(new PropertyFilter(key, '<', condition['less_than']));
          }
          if (condition.hasOwnProperty('less_than_equal')) {
            constraints.push(new PropertyFilter(key, '<=', condition['less_than_equal']));
          }
          if (condition.hasOwnProperty('equals')) {
            if (getFieldConfigByName(key, collectionConfig.fields).hasMany) {
              // FIXME: check if it works
              constraints.push(new PropertyFilter(key, '=', condition['equals']));
            } else {
              constraints.push(new PropertyFilter(key, '=', condition['equals']));
            }
          }
          if (condition.hasOwnProperty('not_equal')) {
            constraints.push(new PropertyFilter(key, '!=', condition['not_equal']));
          }
          if (condition.hasOwnProperty('in')) {
            if (condition['in'].length) {
              if (getFieldConfigByName(key, collectionConfig.fields).hasMany) {
                // FIXME: check if it works
                constraints.push(new PropertyFilter(key, 'IN', condition['in']));
              } else {
                constraints.push(new PropertyFilter(key, 'IN', condition['in']));
              }
            } else {
              /* this makes 0 results ensured, because in is empty */
              constraints.push(new PropertyFilter(key, '=', null));
            }
          }
          if (condition.hasOwnProperty('not_in')) {
            constraints.push(new PropertyFilter(key, 'NOT_IN', condition['not_in']));
          }
          // FIXME: like does not exist, but we use https://stackoverflow.com/a/75877483 as a workaround (prefix search)
          if (condition.hasOwnProperty('like')) {
            constraints.push(and([new PropertyFilter(key, '>=', condition['like']), new PropertyFilter(key, '<=', condition['like'] + '\uf8ff')]));
          }
          // FIXME: contains does not exist, but we use https://stackoverflow.com/a/75877483 as a workaround (prefix search)
          if (condition.hasOwnProperty('contains')) {
            constraints.push(and([new PropertyFilter(key, '>=', condition['contains']), new PropertyFilter(key, '<=', condition['contains'] + '\uf8ff')]));
          }
          if (condition.hasOwnProperty('exists')) {
            if (condition.exists === true) {
              constraints.push(new PropertyFilter(key, '!=', null));
            } else {
              constraints.push(new PropertyFilter(key, '=', null));
            }
          }
        }
      }
    }

    return constraints;
  };



  let firestoreQuery = datastore.createQuery(collectionName).limit(0);
  firestoreQuery = firestoreQuery.filter('latest', '=', true);
  
  if (payloadQuery) {
    const firestoreConstraints = processQuery(payloadQuery);
    if (firestoreConstraints.length === 0) {
      firestoreQuery = datastore.createQuery(collectionName);
    } else {
      const compositeFilter = firestoreConstraints.length === 1 ? firestoreConstraints[0] : and(firestoreConstraints);
      firestoreQuery = datastore.createQuery(collectionName).filter(compositeFilter);
    }
  }

  if (!payloadSort) {
    // FIXME: depend on the fact if updatedAt exists (otherwise use -id)
    payloadSort = '-id';
  }

  if (!Array.isArray(payloadSort)) {
    payloadSort = [payloadSort];
  }

  for (let payloadSortItem of payloadSort) {
    let payloadSortField = payloadSortItem.substr(0, 1) === '-' ? payloadSortItem.substr(1) : payloadSortItem;
    let payloadSortDirection = payloadSortItem.startsWith('-') ? 'desc' : 'asc';
    firestoreQuery = firestoreQuery.order(payloadSortField, {descending: payloadSortDirection === 'desc'});
  }


  return firestoreQuery;
}

export const calculatePageResultStatistics = ({
    totalDocsCount, payloadLimit = 0, page = 1, pagination
}: {totalDocsCount: number, payloadLimit: number, page: number, pagination: boolean}) : {totalPages: number, prevPage: number | null, nextPage: number | null, pagingCounter: number, hasNextPage: boolean, hasPrevPage: boolean} => {
    if (payloadLimit === 0) {
        return {
            totalPages: 1,
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
        pagingCounter: page,
        nextPage: page < totalPages ? page + 1 : null,
        hasNextPage: page < totalPages,
        prevPage: page !== 1 ? page - 1 : null,
        hasPrevPage: page !== 1
    }
};