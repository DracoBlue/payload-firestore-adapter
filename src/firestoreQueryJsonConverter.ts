import { Query, query, where, or, WhereFilterOp, and, collection, Firestore } from "firebase/firestore";

export const generateQueryJson = (queryObject: any) => {
  const query = queryObject._query;
  
  // Extract collection path
  const collection = query.path.segments.join('/');

  let mapFieldFilterToObject = (filter: any) => {
    if (filter.filters) {
      return {
        filters: filter.filters.map(mapFieldFilterToObject),
        operator: filter.op
      }
    } else {
      return {
        field: filter.field.segments.join('.'),
        operator: filter.op,
        value: filter.value.stringValue || filter.value.integerValue || filter.value.doubleValue || filter.value.booleanValue || filter.value.arrayValue || null
      };
    }
  };

  // Extract filters
  const filters = query.filters.map(mapFieldFilterToObject);

  // Extract ordering
  const orderBy = (query.explicitOrderBy || []).map((order: { field: { segments: any[]; }; direction: any; }) => ({
    field: order.field.segments.join('.'),
    direction: order.direction
  }));

  // Extract limit
  const limit = query.limit;

  // Construct simplified JSON representation
  const result = {
    collection,
    filters,
    orderBy,
    limit
  };

  return JSON.stringify(result, null, 4);
}