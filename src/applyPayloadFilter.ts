import { Query } from "mingo";

export const applyPayloadFilter = (entity, query) => {
  const mingoQuery = transformToMingoQuery(query);
  const mingo = new Query(mingoQuery);
  return mingo.test(entity);
}


function transformToMingoQuery(query) {
  const result = {};

  for (const key in query) {
    const condition = query[key];

    // Logical Operators
    if (key === 'and') {
      result['$and'] = condition.map(transformToMingoQuery);
    } else if (key === 'or') {
      result['$or'] = condition.map(transformToMingoQuery);
    }

    // Comparison Operators
    else if (condition.equals !== undefined) {
      result[key] = condition.equals;
    } else if (condition.not_equals !== undefined) {
      result[key] = { $ne: condition.not_equals };
      // FIXME: handle non-date values
    } else if (condition.greater_than !== undefined) {
      result[key] = { $gt: new Date(condition.greater_than) };
    } else if (condition.greater_than_equal !== undefined) {
      result[key] = { $gte: new Date(condition.greater_than_equal) };
    } else if (condition.less_than !== undefined) {
      result[key] = { $lt: new Date(condition.less_than) };
    } else if (condition.less_than_equal !== undefined) {
      result[key] = { $lte: new Date(condition.less_than_equal) };
    }

    // Array Operators
    else if (condition.in !== undefined) {
      result[key] = { $in: condition.in };
    } else if (condition.not_in !== undefined) {
      result[key] = { $nin: condition.not_in };
    } else if (condition.all !== undefined) {
      result[key] = { $all: condition.all };
    }

    // Existence Operators
    else if (condition.exists === true) {
      result[key] = { $exists: true };
    } else if (condition.exists === false) {
      result[key] = { $exists: false };
    }

    // String Operators
    else if (condition.contains !== undefined) {
      result[key] = { $regex: condition.contains, $options: 'i' }; // Case-insensitive regex
    } else if (condition.like !== undefined) {
      result[key] = { $regex: condition.like, $options: 'i' }; // General pattern match
    }

    // Point Operators
    // FIXME within, intersects, near

    // Range Operators
    else if (condition.between !== undefined && Array.isArray(condition.between) && condition.between.length === 2) {
      result[key] = { $gte: condition.between[0], $lte: condition.between[1] };
    }
  }

  return result;
}