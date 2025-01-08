import type { Field } from "payload";

let fillSubFieldNameMapCache = (fieldNameMapCache, fields, prefix) => {
  for (let field of fields as Field[]) {
    fieldNameMapCache[prefix + (field as any).name] = field;
    if (field.type === "array") {
      fillSubFieldNameMapCache(fieldNameMapCache, field.fields, prefix + (field as any).name + ".");
    }
    if (field.type === "group") {
      fillSubFieldNameMapCache(fieldNameMapCache, field.fields, prefix + (field as any).name + ".");
    }
  }
}

export const getSubFieldNameMapCache = function(fields) {
  let fieldNameMapCache = {}
  fillSubFieldNameMapCache(fieldNameMapCache, fields, "");
  return fieldNameMapCache;
}

export const getFieldConfigByName = function(name, fields) {
  let fieldNameMapCache = getSubFieldNameMapCache(fields);
  return fieldNameMapCache[name] || {};
};