import { Query } from "mingo";
import { getFieldConfigByName } from "./getfieldNameConfig";
import { Field, FlattenedField, SanitizedCollectionConfig } from "payload";

export const applyPayloadFilter = (entity, query: Record<string, any>, flattenedFields : FlattenedField[], locale? : string) => {
  const mingoQuery = transformToMingoQuery(query, flattenedFields, locale);
  const mingo = new Query(mingoQuery);
  return mingo.test(entity);
}


function transformToMingoQuery(query: Record<string, any>, flattenedFields : FlattenedField[], locale? : string) {
  const result = {};

  for (const originalKey in query) {
    const condition = query[originalKey];
    let fieldConfig = getFieldConfigByName(originalKey, flattenedFields);
    let key = originalKey;
    if (fieldConfig.localized && locale) {
      key = originalKey + '.' + locale;
    }

    // Logical Operators
    if (key === 'and') {
      result['$and'] = condition.map((subCondition) => transformToMingoQuery(subCondition, flattenedFields, locale));
    } else if (key === 'or') {
      result['$or'] = condition.map((subCondition) => transformToMingoQuery(subCondition, flattenedFields, locale));
    }

    // Comparison Operators
    else if (condition.equals !== undefined) {
      result[key] = condition.equals;
    } else if (condition.not_equals !== undefined) {
      result[key] = { $ne: condition.not_equals };
      // FIXME: handle non-date values
    } else if (condition.greater_than !== undefined) {
      result[key] = { $gt: fieldConfig.type === "date" ? new Date(condition.greater_than) : condition.greater_than };
    } else if (condition.greater_than_equal !== undefined) {
      result[key] = { $gte: fieldConfig.type === "date" ? new Date(condition.greater_than_equal) : condition.greater_than_equal) };
    } else if (condition.less_than !== undefined) {
      result[key] = { $lt: fieldConfig.type === "date" ? new Date(condition.less_than) : condition.less_than};
    } else if (condition.less_than_equal !== undefined) {
      result[key] = { $lte: fieldConfig.type === "date" ? new Date(condition.less_than_equal) : condition.less_than_equal};
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
      result[key] = { $gte: fieldConfig.type === "date" ? new Date(condition.between[0]) : condition.between[0], $lte: fieldConfig.type === "date" ? new Date(condition.between[1]) : condition.between[1] };
    }
  }

  return result;
}
