import { Query, or, and, PropertyFilter, DatastoreRequest } from '@google-cloud/datastore';
import type { Field, SanitizedCollectionConfig, Sort } from 'payload';

type Filter = any;

export const convertPayloadToFirestoreQuery = function(datastoreRequest: DatastoreRequest, collectionName: string, collectionConfig: SanitizedCollectionConfig, payloadQuery: Record<string, any>, payloadSort?: Sort): [Query, boolean] {
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

  const processQuery = (queryObj: Record<string, any>): [Filter[], boolean] => {
    const constraints: Filter[] = [];
    let hasQueryNodeConditions = false;

    if (queryObj.and || queryObj.AND) {
      (queryObj.and || queryObj.AND).forEach((condition: any) => {
        if (condition.or) {
          const [orConditions, hasSubQueryNodeConditions] = processQuery(condition);
          hasQueryNodeConditions = hasQueryNodeConditions || hasSubQueryNodeConditions;

          if (hasSubQueryNodeConditions) {
            /* We cannot use any of the orConditions - since there is non datastore query stuff included. */
          } else {
            if (orConditions.length === 1) {
              constraints.push(orConditions[0]);
            } else if (orConditions.length > 1) {
              constraints.push(or(orConditions));
            }
          }
        } else {
          const [andConditions, hasSubQueryNodeConditions]  = processQuery(condition);
          hasQueryNodeConditions = hasQueryNodeConditions || hasSubQueryNodeConditions;

          if (andConditions.length === 1) {
            constraints.push(andConditions[0]);
          } else if (andConditions.length > 1) {
            constraints.push(and(andConditions));
          }
        }
      });
    } else if (queryObj.or || queryObj.OR) {
      let orConditionsHasNodeConditions = false;
      const orConditions = (queryObj.or || queryObj.OR).map((condition: any) => {
        let [subQueryConditions, hasSubQueryNodeConditions] = processQuery(condition);
        orConditionsHasNodeConditions = orConditionsHasNodeConditions || hasSubQueryNodeConditions;
        return subQueryConditions;
      });
      hasQueryNodeConditions = hasQueryNodeConditions || orConditionsHasNodeConditions;

      if (orConditionsHasNodeConditions) {
            /* We cannot use any of the orConditions - since there is non datastore query stuff included. */
      } else {
        const flattenedConstraints = orConditions.flat() as Filter[];
        if (flattenedConstraints.length === 1) {
          constraints.push(flattenedConstraints[0]);
        } else if (flattenedConstraints.length > 1) {
          constraints.push(or(flattenedConstraints));
        }
      }
    } else {
      for (const key in queryObj) {
        const condition = queryObj[key];
        if (typeof condition === 'string' || typeof condition === 'number') {
          constraints.push(new PropertyFilter(key, '=', condition));
        } else if (typeof condition === 'object') {
          if ("greater_than" in condition) {
            constraints.push(new PropertyFilter(key, '>', condition['greater_than']));
          }
          if ('greater_than_equal' in condition) {
            constraints.push(new PropertyFilter(key, '>=', condition['greater_than_equal']));
          }
          if ('less_than' in condition) {
            constraints.push(new PropertyFilter(key, '<', condition['less_than']));
          }
          if ('less_than_equal' in condition) {
            constraints.push(new PropertyFilter(key, '<=', condition['less_than_equal']));
          }
          if ('equals' in condition) {
            if (getFieldConfigByName(key, collectionConfig.fields).hasMany) {
              // FIXME: check if it works
              constraints.push(new PropertyFilter(key, '=', condition['equals']));
            } else {
              constraints.push(new PropertyFilter(key, '=', condition['equals']));
            }
          }
          if ('not_equals' in condition) {
            constraints.push(new PropertyFilter(key, '!=', condition['not_equals']));
          }
          if ('in' in condition) {
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
          if ('not_in' in condition) {
            constraints.push(new PropertyFilter(key, 'NOT_IN', condition['not_in']));
          }
          // FIXME: like does not exist, but we use https://stackoverflow.com/a/75877483 as a workaround (prefix search)
          if ('like' in condition) {
            /* 
               There is no like search in datastore. The workaround was a prefix search, which we removed here.
               
               Removed: constraints.push(and([new PropertyFilter(key, '>=', condition['like']), new PropertyFilter(key, '<=', condition['like'] + '\uf8ff')]));
            */
            hasQueryNodeConditions = true;
          }
          // FIXME: contains does not exist, but we use https://stackoverflow.com/a/75877483 as a workaround (prefix search)
          if ('contains' in condition) {
            /* 
               There is no contains in strings in datastore. The workaround was a prefix search, which we removed here.
               
               Removed: constraints.push(and([new PropertyFilter(key, '>=', condition['like']), new PropertyFilter(key, '<=', condition['like'] + '\uf8ff')]));
            */
               hasQueryNodeConditions = true;
          }
          if ('exists' in condition) {
            // FIXME: check if only boolean true is actually allowed or not
            if (condition.exists === true || condition.exists === "true") {
              constraints.push(new PropertyFilter(key, '!=', null));
            } else {
              /* 
                 The sideffect is, if the `= null` check is used to check for non-existant and
                 any other field filters for this, too - it won't work.

                 Removed: constraints.push(new PropertyFilter(key, '=', null));
              */
              hasQueryNodeConditions = true;
              
            }
          }
        }
      }
    }

    return [constraints, hasQueryNodeConditions];
  };



  let hasNodeConditions = false;
  let firestoreQuery = datastoreRequest.createQuery(collectionName);
  
  if (payloadQuery) {
    const [firestoreConstraints, hasSubQueryNodeConditions] = processQuery(payloadQuery);
    hasNodeConditions = hasNodeConditions || hasSubQueryNodeConditions;
    if (firestoreConstraints.length !== 0) {
      const compositeFilter = firestoreConstraints.length === 1 ? firestoreConstraints[0] : and(firestoreConstraints);
      firestoreQuery = datastoreRequest.createQuery(collectionName).filter(compositeFilter);
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

  console.log('convertPayloadToFirestoreQuery:result', JSON.stringify([].concat(...firestoreQuery.entityFilters).concat(...firestoreQuery.filters), null, 4));

  return [firestoreQuery, hasNodeConditions];
}
