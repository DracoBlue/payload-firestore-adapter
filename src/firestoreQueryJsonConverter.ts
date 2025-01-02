import { Query } from '@google-cloud/datastore';


export const logQuery = (message, query: Query) => {
  console.log(message, generateQueryJson(query));
}
export const generateQueryJson = ({namespace, kinds, filters, entityFilters, orders, groupByVal, selectVal, startVal, endVal, limitVal, offsetVal}: Query) => {
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

  const allFilters = [].concat(...entityFilters).concat(...filters).map(mapFieldFilterToObject);
  // FIXME: groupByVal, selectVal, startVal, endVal

  const orderBy = orders.map((order) => {
    return {
      field: order.name,
      direction: order.sign === '-' ? 'DESCENDING' : 'ASCENDING'
    };
  })

  const result = {
    kinds,
    filters: allFilters,
    orderBy,
    limit: limitVal,
    offset: offsetVal
  };

  return JSON.stringify(result, null, 4);
}