export const generateQueryJson = (queryObject: any) => {
  const query = queryObject._queryOptions;
 
  // Extract collection path
  const collection = query.collectionId;

  let mapFieldFilterToObject = (filter: any) => {
    if (filter.filters) {
      return {
        filters: filter.filters.map(mapFieldFilterToObject),
        operator: filter.operator
      }
    } else {
      return {
        field: filter.field.segments.join('.'),
        operator: filter.op,
        value: filter.value
      };
    }
  };

  // Extract filters
  const filters = query.filters.map(mapFieldFilterToObject);

  // Extract ordering
  const orderBy = (query.fieldOrders || []).map((order: { field: { segments: any[]; }; direction: any; }) => ({
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