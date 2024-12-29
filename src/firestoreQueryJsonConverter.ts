import { Query } from '@google-cloud/datastore';

export const generateQueryJson = (query: Query) => {
  console.log(query);
  const kinds = query.kinds;

  let mapFieldFilterToObject = (filter: any) => {
    if (filter.filters) {
      return {
        filters: filter.filters.map(mapFieldFilterToObject),
        operator: filter.op
      }
    } else {
      return {
        field: filter.name,
        operator: filter.op,
        value: filter.val
      };
    }
  };

  const filters = [].concat(...query.entityFilters).concat(...query.filters).map(mapFieldFilterToObject);
  // FIXME: groupByVal, selectVal, startVal, endVal

  const orderBy = query.orders.map((order) => {
    return {
      field: order.name,
      direction: order.sign === '-' ? 'DESCENDING' : 'ASCENDING'
    };
  })

  const limit = query.limitVal;
  const offset = query.offsetVal;

  const result = {
    kinds,
    filters,
    orderBy,
    limit,
    offset
  };

  return JSON.stringify(result, null, 4);
}