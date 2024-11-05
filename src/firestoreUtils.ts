import { collection, query, where, or, Firestore, QueryCompositeFilterConstraint, and, QueryFilterConstraint, orderBy, OrderByDirection } from 'firebase/firestore';
import type { Sort } from 'payload';


/**
 * Converts Payload CMS query JSON to Firestore query constraints.
 * @param {string} collectionName - The Firestore collection name.
 * @param {Object} payloadQuery - The Payload CMS query JSON.
 * @returns {Query} - Firestore query.
 */
export const convertPayloadToFirestoreQuery = function(firestore: Firestore, collectionName: string, payloadQuery: Record<string, any>, payloadSort?: Sort) {
  console.log('convertPayloadToFirestoreQuery', collectionName, JSON.stringify(payloadQuery, null, 4));

  const processQuery = (queryObj: Record<string, any>): QueryFilterConstraint[] => {
    const constraints: QueryFilterConstraint[] = [];

    if (queryObj.and) {
      queryObj.and.forEach((condition: any) => {
        if (condition.or) {
          const orConditions = processQuery(condition);
          constraints.push(or(...orConditions));
        } else {
          const andConditions = processQuery(condition);
          constraints.push(and(...andConditions));
        }
      });
    } else if (queryObj.or) {
      const orConditions = queryObj.or.map((condition: any) => processQuery(condition));
      const flattenedConstraints = orConditions.flat() as QueryCompositeFilterConstraint[];
      constraints.push(or(...flattenedConstraints));
    } else {
      for (const key in queryObj) {
        const condition = queryObj[key];
        if (typeof condition === 'string' || typeof condition === 'number') {
          constraints.push(where(key, '==', condition));
        } else if (typeof condition === 'object') {
          if (condition.hasOwnProperty('greater_than')) {
            constraints.push(where(key, '>', condition['greater_than']));
          }
          if (condition.hasOwnProperty('greater_than_equal')) {
            constraints.push(where(key, '>=', condition['greater_than_equal']));
          }
          if (condition.hasOwnProperty('less_than')) {
            constraints.push(where(key, '<', condition['less_than']));
          }
          if (condition.hasOwnProperty('less_than_equal')) {
            constraints.push(where(key, '<=', condition['less_than_equal']));
          }
          if (condition.hasOwnProperty('equals')) {
            constraints.push(where(key, '==', condition['equals']));
          }
          if (condition.hasOwnProperty('not_equal')) {
            constraints.push(where(key, '!=', condition['not_equal']));
          }
          if (condition.hasOwnProperty('in')) {
            if (condition['in'].length) {
              constraints.push(where(key, 'in', condition['in']));
            } else {
              /* this makes 0 results ensured, because in is empty */
              constraints.push(where(key, '==', null));
            }
          }
          if (condition.hasOwnProperty('not_in')) {
            constraints.push(where(key, 'not-in', condition['not_in']));
          }
          // FIXME: like does not exist, but we use https://stackoverflow.com/a/75877483 as a workaround (prefix search)
          if (condition.hasOwnProperty('like')) {
            constraints.push(and(where(key, '>=', condition['like']), where(key, '<=', condition['like'] + '\uf8ff')));
          }
          if (condition.hasOwnProperty('exists')) {
            if (condition.exists === true) {
              constraints.push(where(key, '!=', null));
            } else {
              constraints.push(where(key, '==', null));
            }
          }
        }
      }
    }

    return constraints;
  };



  let firestoreQuery = query(collection(firestore, collectionName))
  
  if (payloadQuery) {
    const firestoreConstraints = processQuery(payloadQuery);
    const compositeFilter = and(...firestoreConstraints);
    firestoreQuery = query(collection(firestore, collectionName), compositeFilter);
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
    let payloadSortDirection : OrderByDirection = payloadSortItem.startsWith('-') ? 'desc' : 'asc';
    firestoreQuery = query(firestoreQuery, orderBy(payloadSortField, payloadSortDirection));
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