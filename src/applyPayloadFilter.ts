import { Query } from "mingo";

/**
 * Applies a Payload CMS query to filter an entity using Mingo.
 * @param {Object} entity - The entity to filter.
 * @param {Object} query - The Payload CMS query to apply.
 * @returns {boolean} - Whether the entity matches the query.
 */
export const applyPayloadFilter = (entity, query) => {
  // Transform Payload CMS query to Mingo-compatible syntax
  const mingoQuery = transformToMingoQuery(query);

  // Use Mingo's Query to evaluate the entity
  const mingo = new Query(mingoQuery);
  return mingo.test(entity);
}

/**
 * Transforms Payload CMS query syntax into Mingo-compatible query syntax.
 * @param {Object} query - The Payload CMS query.
 * @returns {Object} - The transformed query for Mingo.
 */
function transformToMingoQuery(query) {
  const result = {};

  for (const key in query) {
    const condition = query[key];

    if (key === 'and') {
      result['$and'] = condition.map(transformToMingoQuery);
    } else if (key === 'or') {
      result['$or'] = condition.map(transformToMingoQuery);
    } else if (condition.exists === false) {
      result[key] = { $exists: false };
    } else if (condition.exists === true) {
      result[key] = { $exists: true };
    } else if (condition.less_than) {
      result[key] = { $lt: new Date(condition.less_than) };
    } else if (condition.greater_than) {
      result[key] = { $gt: new Date(condition.greater_than) };
    } else if (condition.equals) {
      result[key] = condition.equals;
    }
  }

  return result;
}
