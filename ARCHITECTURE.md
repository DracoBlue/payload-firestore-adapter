# architecture of payload-firestore-adapter

This shares some details about how the payload
firestore adapter works internally and why
specific decisions have been made in the past.

## datastore mode

The adapter currently works only with a firestore
database in "datastore mode".

There is a [comparison between datastore and native mode](https://cloud.google.com/firestore/docs/firestore-or-datastore?hl=en)
and it states:

> **Use Firestore in Datastore mode for new server projects.**
> Firestore in Datastore mode allows you to use established Datastore server architectures while removing fundamental Datastore limitations. Datastore mode can automatically scale to millions of writes per second.

## querying the datastore

The payload cms [supports a wide range of queries](https://payloadcms.com/docs/queries/overview),
but some are not supported by datastore mode of firestore.

Thus we choose the following approach for handling
queries:

1. convert the payload query to a datastore query
2. if 1. does suppprt everything in pure datastore
   apply offset+limit and return the results
3. if 1. does not support everything natively continue
4. query a broader search for all results without
   limit/offset and without what's not supported in
    datastore mode of firestore
5. use "mingo" in memory mongodb-inspired library to
   filter results by all parts of the initial payload
   query and slice by offset/filter afterwards
6. return the results

## operators

Some operators like "equals" are straight forward,
but others need special treatment.

| **Operator**            | **Description**                                                                 | **Firestore Compatibility** | **Special Cases Handled by Mingo** |
|--------------------------|---------------------------------------------------------------------------------|-----------------------------|-------------------------------------|
| `equals`                 | Matches documents where a field's value is exactly equal to the specified value. | ✅ Supported                | None                                |
| `contains`               | Performs a case-insensitive substring search within a string field.              | ❌ Not Supported            | Fully handled by Mingo              |
| `not_equals`             | Matches documents where a field's value is not equal to the specified value.     | ✅ Supported with Index     | Combined with `OR` conditions       |
| `in`                     | Matches documents where a field's value is within a specified array of values.   | ✅ Supported (Max 10 items) | Arrays exceeding 10 items           |
| `all`                    | Matches documents where an array field contains all the specified values.        | ❌ Not Supported            | Fully handled by Mingo              |
| `not_in`                 | Matches documents where a field's value is not within a specified array of values.| ✅ Supported (Max 10 items) | Arrays exceeding 10 items           |
| `exists`                 | Checks whether a specific field exists or not in a document.                     | ✅ Supported                | Nested in `OR` or combined with sorting |
| `greater_than`           | Matches documents where a field's value is greater than the specified value.     | ✅ Supported                | Combined with unsupported `OR` logic |
| `greater_than_equal`     | Matches documents where a field's value is greater than or equal to the specified value.| ✅ Supported | Combined with unsupported `OR` logic |
| `less_than`              | Matches documents where a field's value is less than the specified value.        | ✅ Supported                | Combined with unsupported `OR` logic |
| `less_than_equal`        | Matches documents where a field's value is less than or equal to the specified value.| ✅ Supported              | Combined with unsupported `OR` logic |
| `like`                   | Performs a case-insensitive search where the field contains the specified substring.| ❌ Not Supported        | Fully handled by Mingo              |
| `within`                 | Filters documents based on whether geolocation fields are inside a given area defined in GeoJSON.| ❌ Not Supported | Fully handled by Mingo |
| `intersects`             | Filters documents based on whether geolocation fields intersect with a given area defined in GeoJSON.| ❌ Not Supported | Fully handled by Mingo |
| `near`                   | Finds documents with geolocation fields near a specified point.                  | ❌ Not Supported            | Fully handled by Mingo              |

**Notes:**

If the operator has **Firestore Compatibility**, it indicates whether the operator is natively supported in Firestore's Datastore mode. The **Special Cases Handled by Mingo** describes
scenarios where Mingo is utilized to handle specific cases that Firestore cannot process directly.

### `contains` Operator

**Description:**  
The `contains` operator in Payload CMS is used to perform a **case-insensitive substring search** within a string field. It matches documents where the specified field contains the given substring.

**Explicit Check in Firestore:**  
Firestore's Datastore mode does **not natively support** substring searches or case-insensitive text matching. Therefore, implementing the `contains` functionality directly within Firestore is not feasible.

**Side Effects:**  
- Attempting to perform substring searches in Firestore requires downloading entire datasets and filtering them client-side, leading to **inefficiencies** and increased **latency**.
- Lack of native support for case-insensitive searches necessitates additional processing or external tools.

**Decision:**  
Due to the limitations mentioned above, it's advisable to **offload the `contains` operator to Mingo** or consider integrating a dedicated **full-text search service** like **ElasticSearch** for efficient substring and case-insensitive searches.

### `exists` operator

Is either `true` or `false`. It wants to return
all documents, which have this specific field set.

Explicit check:

`exists: true`: It can be done in datastore mode of firestore by
checking a `new PropertyFilter(key, "!=", null)`.
`exists: false`: It can be done in datastore mode of firestore by
checking a `new PropertyFilter(key, "==", null)`.

Sideeffects:

The datastore mode of firestore has two cases where
the `!= null` is implied:

* as soon as you order by this field
* if it is part of an OR query

Decision:

1. if there is exists: true included in any but not all of the ORs -> offload to mingo
2. if the field is sorted (but exists: false) -> offload to mingo

### `not_equals` Operator

**Description:**  
- Matches documents where a field's value is **not equal** to the specified value.

**Explicit Check:**  
- Achievable using `new PropertyFilter(key, "!=", value)` in Datastore mode.

**Side Effects:**  
- Firestore's Datastore mode **requires an index** for `!=` queries.  
- Combining `!=` with other inequality filters on the same field can lead to **complex index requirements**.

**Decision:**  
1. If the necessary indexes are in place and the query is straightforward (`field != value`) → **Process in Datastore**.  
2. If combined with multiple inequality filters or lacks proper indexing → **Offload to Mingo**.

### `greater_than_equal` Operator

**Description:**  
- Matches documents where a field's value is **greater than or equal** to the specified value.

**Explicit Check:**  
- Achievable using `new PropertyFilter(key, ">=", value)` in Datastore mode.

**Side Effects:**  
- Similar to `greater_than`, it may not handle mixed types effectively.  
- Issues arise when combined with `OR` or nested logical operators.

**Decision:**  
1. If used independently (`field >= value`) → **Process in Datastore**.  
2. If nested in complex logical conditions (`AND`, `OR`) → **Offload to Mingo**.

### `less_than_equal` Operator

**Description:**  
- Matches documents where a field's value is **less than or equal** to the specified value.

**Explicit Check:**  
- Achievable using `new PropertyFilter(key, "<=", value)` in Datastore mode.

**Side Effects:**  
- Similar constraints as `less_than`.  
- Type mismatches or complex logical conditions (`OR`) may cause unexpected results.

**Decision:**  
1. If used independently (`field <= value`) → **Process in Datastore**.  
2. If part of nested logical conditions → **Offload to Mingo**.

### `like` Operator

**Description:**  
- Performs a **case-insensitive search** where the field contains the specified substring.

**Explicit Check:**  
- **Not natively supported** in Firestore's Datastore mode.  
- Requires **full-text search capabilities**, which are not available by default.

**Side Effects:**  
- Implementing `like` queries can be **inefficient** and may require external services or additional infrastructure.

**Decision:**  
1. For simple substring searches, consider using **Firestore's `array-contains`** if applicable.  
2. For complex `like` queries → **Offload to Mingo** or consider integrating a dedicated **full-text search service**.

### `in` Operator

**Description:**  
- Matches documents where a field's value is **within a specified array** of values.

**Explicit Check:**  
- Achievable using `new PropertyFilter(key, "in", arrayOfValues)` in Datastore mode.

**Side Effects:**  
- The **maximum array length** for `in` queries is **10**.  
- Exceeding this limit results in an **invalid argument error**.

**Decision:**  
1. If the array length is **10 or fewer** (`field in [values]`) → **Process in Datastore**.  
2. If the array length exceeds 10 → **Offload to Mingo**.

### `not_in` Operator

**Description:**  
- Matches documents where a field's value is **not within a specified array** of values.

**Explicit Check:**  
- Achievable using `new PropertyFilter(key, "not-in", arrayOfValues)` in Datastore mode.

**Side Effects:**  
- Similar to the `in` operator, the **maximum array length** is **10**.  
- Requires proper indexing and can be **resource-intensive** for large datasets.

**Decision:**  
1. If the array length is **10 or fewer** and proper indexing exists (`field not in [values]`) → **Process in Datastore**.  
2. If the array length exceeds 10 or lacks indexing → **Offload to Mingo**.

### `all` Operator

**Description:**  
- Matches documents where an **array field** contains **all the specified values**.

**Explicit Check:**  
- **Not natively supported** in Firestore's Datastore mode.  
- Requires multiple `array-contains` filters, which cannot be combined in a single query.

**Side Effects:**  
- Implementing `all` logic requires **multiple queries** and **post-processing**, leading to **inefficiencies**.

**Decision:**  
1. For simple cases with a single value, use `array-contains`.  
2. For multiple values or complex `all` conditions → **Offload to Mingo**.

### `near` Operator

**Description:**  
- Finds documents with **geolocation fields** near a specified point, optionally within a certain distance.

**Explicit Check:**  
- **Not natively supported** in Firestore's Datastore mode.  
- Requires **geospatial indexing** and querying capabilities.

**Side Effects:**  
- Implementing `near` queries necessitates **external services** or **custom indexing**.  
- May lead to **performance issues** without proper optimization.

**Decision:**  
1. For basic proximity searches, consider using **Firestore's geohashing** techniques.  
2. For advanced geospatial queries → **Offload to Mingo** or integrate a dedicated **geospatial service**.

### `within` Operator

**Description:**  
- Filters documents based on whether **geolocation fields** are inside a given area defined in GeoJSON.

**Explicit Check:**  
- **Not natively supported** in Firestore's Datastore mode.  
- Requires **geospatial querying capabilities**.

**Side Effects:**  
- Complex polygon queries may lead to **performance bottlenecks**.  
- Requires **additional processing** to evaluate spatial relationships.

**Decision:**  
1. For simple bounding box queries, consider using **Firestore's range queries**.  
2. For complex spatial queries → **Offload to Mingo** or utilize a specialized **geospatial database**.

### `intersects` Operator

**Description:**  
- Filters documents based on whether **geolocation fields** intersect with a given area defined in GeoJSON.

**Explicit Check:**  
- **Not natively supported** in Firestore's Datastore mode.  
- Geospatial querying for polygon intersections isn't directly supported.  
- Usually requires external tools or additional query transformations.

**Side Effects:**  
- Processing geospatial intersection queries in Firestore is complex and inefficient without proper geospatial indexing.  
- Requires custom logic to evaluate spatial relationships in Node.js or external tools.

**Decision:**  
1. For basic bounding box queries, leverage **Firestore's range queries** if feasible.  
2. For complex intersection conditions → **Offload to Mingo** or use a specialized **geospatial database** like **PostGIS** or **MongoDB with geospatial indexing**.

 
